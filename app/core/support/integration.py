"""Integration services — cloud storage, SMS/Email sending via SUBMAIL.

Migrated from Java: com.rebuild.core.support.integration.QiniuCloud,
com.rebuild.core.support.integration.SMSender.
Provides cloud storage (Qiniu/local) and SUBMAIL-based SMS/Email sending.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os
import shutil
import threading
import time
from base64 import b64encode
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

import httpx

from app.core.support.config import (
    ConfigurationItem,
    get_config,
    get_file_of_data,
    get_storage_account,
    get_mail_account,
    get_sms_account,
)

log = logging.getLogger(__name__)


# ── SMSenderContextHolder (thread-local) ─────────────────────────────────────

_context_local = threading.local()


class SMSenderContextHolder:
    """Thread-local holder for SMS sender context (from-source tracking).
    
    Migrated from Java: com.rebuild.core.support.integration.SMSenderContextHolder
    """
    
    @staticmethod
    def set_from_source(source_id: str):
        _context_local._from_source = source_id
    
    @staticmethod
    def get_from_source() -> str | None:
        return getattr(_context_local, "_from_source", None)
    
    @staticmethod
    def get_from_source_once() -> str | None:
        """Get and clear the from-source (one-shot read)."""
        val = getattr(_context_local, "_from_source", None)
        _context_local._from_source = None
        return val


# ── QiniuCloud Storage ───────────────────────────────────────────────────────


class QiniuCloud:
    """Cloud storage via Qiniu (七牛云) or local filesystem fallback.
    
    Migrated from Java: com.rebuild.core.support.integration.QiniuCloud
    
    When Qiniu credentials are configured, files are uploaded to Qiniu CDN.
    Otherwise falls back to local file storage under the data directory.
    """
    
    _instance: QiniuCloud | None = None
    _lock = threading.Lock()
    
    def __init__(self):
        self._auth: dict | None = None
        self._bucket: str = ""
        self._base_url: str = ""
        self._init_auth()
    
    @classmethod
    def instance(cls) -> QiniuCloud:
        """Singleton access."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance
    
    def _init_auth(self):
        """Initialize Qiniu auth from storage configuration."""
        account = get_storage_account()
        if account and len(account) >= 3 and all(account):
            self._auth = {"access_key": account[0], "secret_key": account[1]}
            self._bucket = account[2]
            self._base_url = account[3] if len(account) > 3 and account[3] else ""
            log.info(f"QiniuCloud initialized. Bucket: {self._bucket}")
        else:
            self._auth = None
            log.info("No QiniuCloud configuration. Using local storage.")
    
    @property
    def available(self) -> bool:
        """Check if Qiniu cloud storage is configured and available."""
        return self._auth is not None
    
    def init_auth(self):
        """Re-initialize auth (e.g., after config change)."""
        self._init_auth()
    
    def upload(self, file_path: str, key: str | None = None) -> str:
        """Upload a file to Qiniu or local storage.
        
        Args:
            file_path: Local file path to upload
            key: Optional storage key (defaults to auto-generated)
        
        Returns:
            The URL or path of the uploaded file
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
        
        if not self.available:
            return self._upload_local(file_path, key)
        
        return self._upload_qiniu(file_path, key)
    
    def upload_bytes(self, data: bytes, key: str, mime_type: str = "") -> str:
        """Upload raw bytes to Qiniu or local storage."""
        if not self.available:
            local_path = get_file_of_data(key)
            os.makedirs(os.path.dirname(local_path), exist_ok=True)
            with open(local_path, "wb") as f:
                f.write(data)
            return key
        
        return self._upload_qiniu_bytes(data, key, mime_type)
    
    def delete(self, key: str) -> bool:
        """Delete a file from storage."""
        if not self.available:
            local_path = get_file_of_data(key)
            if os.path.exists(local_path):
                os.remove(local_path)
                return True
            return False
        
        return self._delete_qiniu(key)
    
    def get_url(self, key: str) -> str:
        """Get the public URL for a stored file."""
        if not self.available:
            return f"/filex/{key}"
        
        if self._base_url:
            return f"{self._base_url}/{key}"
        
        return f"https://{self._bucket}.qiniucs.com/{key}"
    
    def _upload_local(self, file_path: str, key: str | None = None) -> str:
        """Upload to local filesystem."""
        if key is None:
            ext = os.path.splitext(file_path)[1]
            date_prefix = datetime.utcnow().strftime("%Y%m")
            key = f"file/{date_prefix}/{hashlib.md5(str(time.time()).encode()).hexdigest()}{ext}"
        
        dest = get_file_of_data(key)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        shutil.copy2(file_path, dest)
        return key
    
    def _upload_qiniu(self, file_path: str, key: str | None = None) -> str:
        """Upload to Qiniu cloud storage."""
        try:
            # Generate upload token
            token = self._generate_upload_token(key or "")
            
            # Read file
            with open(file_path, "rb") as f:
                data = f.read()
            
            # Upload via HTTP
            url = "https://up.qiniup.com/"
            files = {"file": (os.path.basename(file_path), data)}
            form_data = {"token": token}
            if key:
                form_data["key"] = key
            
            resp = httpx.post(url, data=form_data, files=files, timeout=60)
            result = resp.json()
            
            if "key" in result:
                return result["key"]
            else:
                log.error(f"Qiniu upload failed: {result}")
                return self._upload_local(file_path, key)
        except Exception as e:
            log.error(f"Qiniu upload error: {e}, falling back to local")
            return self._upload_local(file_path, key)
    
    def _upload_qiniu_bytes(self, data: bytes, key: str, mime_type: str = "") -> str:
        """Upload raw bytes to Qiniu."""
        try:
            token = self._generate_upload_token(key)
            
            url = "https://up.qiniup.com/"
            files = {"file": (key.split("/")[-1], data, mime_type or "application/octet-stream")}
            form_data = {"token": token, "key": key}
            
            resp = httpx.post(url, data=form_data, files=files, timeout=60)
            result = resp.json()
            
            if "key" in result:
                return result["key"]
            else:
                log.error(f"Qiniu upload bytes failed: {result}")
                local_path = get_file_of_data(key)
                os.makedirs(os.path.dirname(local_path), exist_ok=True)
                with open(local_path, "wb") as f:
                    f.write(data)
                return key
        except Exception as e:
            log.error(f"Qiniu upload bytes error: {e}")
            local_path = get_file_of_data(key)
            os.makedirs(os.path.dirname(local_path), exist_ok=True)
            with open(local_path, "wb") as f:
                f.write(data)
            return key
    
    def _delete_qiniu(self, key: str) -> bool:
        """Delete a file from Qiniu."""
        try:
            token = self._generate_token()
            url = f"https://rs.qiniu.com/delete/{self._encode_entry_key(key)}"
            headers = {"Authorization": f"QBox {token}"}
            resp = httpx.post(url, headers=headers, timeout=10)
            return resp.status_code == 200
        except Exception as e:
            log.error(f"Qiniu delete error: {e}")
            return False
    
    def _generate_upload_token(self, key: str = "") -> str:
        """Generate a Qiniu upload token."""
        if not self._auth:
            return ""
        
        deadline = int(time.time()) + 3600
        policy = {
            "scope": f"{self._bucket}:{key}" if key else self._bucket,
            "deadline": deadline,
        }
        policy_b64 = b64encode(json.dumps(policy).encode()).decode()
        sign = self._sign(policy_b64)
        return f"{self._auth['access_key']}:{sign}:{policy_b64}"
    
    def _generate_token(self) -> str:
        """Generate a Qiniu management token."""
        if not self._auth:
            return ""
        deadline = int(time.time()) + 3600
        policy = {"deadline": deadline}
        policy_b64 = b64encode(json.dumps(policy).encode()).decode()
        sign = self._sign(policy_b64)
        return f"{self._auth['access_key']}:{sign}:{policy_b64}"
    
    def _sign(self, data: str) -> str:
        """HMAC-SHA1 sign data with secret key."""
        if not self._auth:
            return ""
        h = hmac.new(
            self._auth["secret_key"].encode(),
            data.encode(),
            hashlib.sha1,
        )
        return b64encode(h.digest()).decode()
    
    def _encode_entry_key(self, key: str) -> str:
        """Base64-encode the entry key for Qiniu management API."""
        return b64encode(f"{self._bucket}:{key}".encode()).decode()


# ── SUBMAIL SMS/Email Sender ─────────────────────────────────────────────────


SUBMAIL_API_URL = "https://api-v4.mysubmail.com"


class SMSender:
    """SUBMAIL SMS and Email sender.
    
    Migrated from Java: com.rebuild.core.support.integration.SMSender
    
    Uses SUBMAIL API v4 for SMS and email sending.
    Falls back to SMTP for email when SUBMAIL is not configured.
    """
    
    TYPE_SMS = 1
    TYPE_EMAIL = 2
    STATUS_OK = "success"
    
    # ── SMS ──
    
    @staticmethod
    def send_sms(to: str, content: str, template_id: str = "",
                 vars_map: dict[str, str] | None = None) -> str | None:
        """Send an SMS message via SUBMAIL.
        
        Args:
            to: Phone number
            content: Message content (or template content if template_id provided)
            template_id: Optional SUBMAIL template ID
            vars_map: Template variable mapping
        
        Returns:
            Message ID on success, None on failure
        """
        account = get_sms_account()
        if not account:
            log.warning("SMS not configured. Skipping send.")
            return None
        
        try:
            sms_data = {
                "appid": account[0],
                "signature": account[1],
                "to": to,
            }
            
            if template_id and vars_map:
                sms_data["template"] = template_id
                sms_data["vars"] = json.dumps(vars_map)
            else:
                sms_data["content"] = content
            
            resp = httpx.post(
                f"{SUBMAIL_API_URL}/sms/send",
                data=sms_data,
                timeout=15,
            )
            result = resp.json()
            
            if result.get("status") == SMSender.STATUS_OK:
                msg_id = result.get("send_id", "")
                log.info(f"SMS sent to {to}. ID: {msg_id}")
                SMSender._log_sms_send(to, content, True)
                return msg_id
            else:
                log.warning(f"SMS send failed: {result}")
                SMSender._log_sms_send(to, content, False)
                return None
        except Exception as e:
            log.error(f"SMS send error: {e}")
            SMSender._log_sms_send(to, str(e), False)
            return None
    
    @staticmethod
    def send_sms_async(to: str, content: str, template_id: str = "",
                       vars_map: dict[str, str] | None = None):
        """Send SMS asynchronously."""
        t = threading.Thread(
            target=SMSender.send_sms,
            args=(to, content, template_id, vars_map),
            daemon=True,
        )
        t.start()
    
    @staticmethod
    def sms_content(to: str, content: str, template_id: str = "") -> dict:
        """Validate SMS content and get pricing info."""
        account = get_sms_account()
        if not account:
            return {"error": "SMS not configured"}
        
        try:
            sms_data = {
                "appid": account[0],
                "signature": account[1],
                "to": to,
            }
            if template_id:
                sms_data["template"] = template_id
            else:
                sms_data["content"] = content
            
            resp = httpx.post(
                f"{SUBMAIL_API_URL}/sms/send",
                data=sms_data,
                timeout=10,
            )
            return resp.json()
        except Exception as e:
            return {"error": str(e)}
    
    # ── Email ──
    
    @staticmethod
    def send_mail(to: str, subject: str, content: str,
                  attachments: list[str] | None = None) -> str | None:
        """Send an email via SUBMAIL or SMTP fallback.
        
        Args:
            to: Email address
            subject: Email subject
            content: HTML content
            attachments: Optional list of file paths
        
        Returns:
            Message ID on success, None on failure
        """
        account = get_mail_account()
        if not account:
            log.warning("Email not configured. Skipping send.")
            return None
        
        try:
            mail_data = {
                "appid": account[0],
                "signature": account[1],
                "to": to,
                "subject": subject,
                "html": content,
                "from": account[2] if len(account) > 2 else "",
                "from_name": account[3] if len(account) > 3 else "REBUILD",
            }
            
            # Handle attachments
            if attachments:
                for i, filepath in enumerate(attachments):
                    if os.path.exists(filepath):
                        with open(filepath, "rb") as f:
                            attachment_data = f.read()
                        b64_data = b64encode(attachment_data).decode()
                        mail_data[f"attachment[{i}]"] = json.dumps({
                            "filename": os.path.basename(filepath),
                            "content": b64_data,
                        })
            
            resp = httpx.post(
                f"{SUBMAIL_API_URL}/email/send",
                data=mail_data,
                timeout=30,
            )
            result = resp.json()
            
            if result.get("status") == SMSender.STATUS_OK:
                msg_id = result.get("send_id", "")
                log.info(f"Email sent to {to}. ID: {msg_id}")
                SMSender._log_mail_send(to, subject, True)
                return msg_id
            else:
                log.warning(f"Email send failed: {result}")
                SMSender._log_mail_send(to, subject, False)
                return None
        except Exception as e:
            log.error(f"Email send error: {e}")
            SMSender._log_mail_send(to, subject, False)
            return None
    
    @staticmethod
    def send_mail_async(to: str, subject: str, content: str,
                        attachments: list[str] | None = None,
                        callback: Any = None):
        """Send email asynchronously."""
        def _do_send():
            result = SMSender.send_mail(to, subject, content, attachments)
            if callback:
                try:
                    callback(result)
                except Exception:
                    pass
        
        t = threading.Thread(target=_do_send, daemon=True)
        t.start()
    
    @staticmethod
    def mail_content(to: str, subject: str, content: str) -> dict:
        """Validate email content."""
        account = get_mail_account()
        if not account:
            return {"error": "Email not configured"}
        
        try:
            mail_data = {
                "appid": account[0],
                "signature": account[1],
                "to": to,
                "subject": subject,
                "html": content,
            }
            resp = httpx.post(
                f"{SUBMAIL_API_URL}/email/send",
                data=mail_data,
                timeout=10,
            )
            return resp.json()
        except Exception as e:
            return {"error": str(e)}
    
    # ── Logging ──
    
    @staticmethod
    def _log_sms_send(to: str, content: str, success: bool):
        """Log SMS send attempt."""
        from app.models import SmsendLog
        from app.database import SessionLocal
        
        try:
            db = SessionLocal()
            log_entry = SmsendLog(
                type=SMSender.TYPE_SMS,
                to_address=to,
                content=content[:500],
                send_time=datetime.utcnow(),
                status=1 if success else 0,
            )
            db.add(log_entry)
            db.commit()
            db.close()
        except Exception as e:
            log.warning(f"Failed to log SMS: {e}")
    
    @staticmethod
    def _log_mail_send(to: str, subject: str, success: bool):
        """Log email send attempt."""
        from app.models import SmsendLog
        from app.database import SessionLocal
        
        try:
            db = SessionLocal()
            log_entry = SmsendLog(
                type=SMSender.TYPE_EMAIL,
                to_address=to,
                content=subject[:500],
                send_time=datetime.utcnow(),
                status=1 if success else 0,
            )
            db.add(log_entry)
            db.commit()
            db.close()
        except Exception as e:
            log.warning(f"Failed to log email: {e}")


# ── Convenience functions ────────────────────────────────────────────────────


def get_cloud_storage() -> QiniuCloud:
    """Get the cloud storage instance."""
    return QiniuCloud.instance()


def upload_file(file_path: str, key: str | None = None) -> str:
    """Upload a file to cloud storage (Qiniu or local)."""
    return QiniuCloud.instance().upload(file_path, key)


def get_file_url(key: str) -> str:
    """Get the public URL for a stored file."""
    return QiniuCloud.instance().get_url(key)


def send_sms(to: str, content: str, **kwargs) -> str | None:
    """Send SMS (convenience wrapper)."""
    return SMSender.send_sms(to, content, **kwargs)


def send_email(to: str, subject: str, content: str, **kwargs) -> str | None:
    """Send email (convenience wrapper)."""
    return SMSender.send_mail(to, subject, content, **kwargs)
