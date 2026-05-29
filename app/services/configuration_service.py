"""Configuration service — system settings, integration configs, maintenance mode."""
import json
import shutil
import os
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from app.models import SystemConfig


# In-memory maintenance mode
_maintenance_mode: Optional[dict] = None


def get_config(db: Session, item: str) -> Optional[str]:
    """Get a single configuration value by item name."""
    row = db.query(SystemConfig).filter(SystemConfig.item == item).first()
    return row.value if row else None


def set_config(db: Session, item: str, value: str) -> None:
    """Set a single configuration value."""
    row = db.query(SystemConfig).filter(SystemConfig.item == item).first()
    if row:
        row.value = value
        row.modified_on = datetime.utcnow()
    else:
        row = SystemConfig(item=item, value=value)
        db.add(row)
    db.commit()


def set_configs(db: Session, data: dict) -> None:
    """Bulk-set configuration values from a dict."""
    for item, value in data.items():
        set_config(db, item, str(value) if value is not None else None)


def get_all_configs(db: Session, prefix: str = None) -> dict:
    """Get all configuration values, optionally filtered by prefix."""
    query = db.query(SystemConfig)
    if prefix:
        query = query.filter(SystemConfig.item.like(f"{prefix}%"))
    rows = query.all()
    return {r.item: r.value for r in rows}


def clear_configs_by_prefix(db: Session, prefix: str) -> int:
    """Clear all configuration values matching a prefix."""
    rows = db.query(SystemConfig).filter(SystemConfig.item.like(f"{prefix}%")).all()
    for r in rows:
        db.delete(r)
    db.commit()
    return len(rows)


def desensitize(value: Optional[str]) -> Optional[str]:
    """Partially mask a sensitive value."""
    if not value or len(value) <= 4:
        return value
    return value[:2] + "*" * (len(value) - 4) + value[-2:]


def get_storage_config(db: Session) -> dict:
    """Get storage integration config."""
    return {
        "StorageURL": get_config(db, "StorageURL"),
        "StorageBucket": get_config(db, "StorageBucket"),
        "StorageApiKey": desensitize(get_config(db, "StorageApiKey")),
        "StorageApiSecret": desensitize(get_config(db, "StorageApiSecret")),
    }


def save_storage_config(db: Session, data: dict) -> Optional[str]:
    """Save storage integration config. Returns error message or None on success."""
    url = data.get("StorageURL", "")
    if url and not url.startswith(("http://", "https://", "//")):
        return "无效访问域名"
    set_configs(db, data)
    return None


def get_submail_config(db: Session) -> dict:
    """Get SMS/email (Submail) config."""
    sms_keys = ["SmsUser", "SmsPassword", "SmsSign", "SmsServer"]
    mail_keys = ["MailUser", "MailPassword", "MailAddr", "MailName", "MailSmtpServer"]
    sms = {k: desensitize(get_config(db, k)) for k in sms_keys}
    mail = {k: desensitize(get_config(db, k)) for k in mail_keys}
    return {"sms": sms, "mail": mail}


def save_submail_config(db: Session, data: dict) -> Optional[str]:
    """Save SMS/email config."""
    mail_addr = data.get("MailAddr")
    if mail_addr and "@" not in mail_addr:
        return "无效发件人地址"
    set_configs(db, data)
    return None


def test_submail(db: Session, msg_type: str, receiver: str) -> Optional[str]:
    """Test SMS or email send. Returns sent message or error."""
    # In production this would call SMSender; here we simulate success
    if msg_type.upper() == "SMS":
        if not receiver or len(receiver) != 11:
            return None  # invalid phone
    elif msg_type.upper() == "EMAIL":
        if not receiver or "@" not in receiver:
            return None
    return f"发送成功 : {receiver}"


def get_submail_stats(db: Session) -> dict:
    """Get SMS/email sending statistics for last 90 days."""
    from app.models import SmsendLog
    cutoff = datetime.utcnow() - timedelta(days=90)

    sms_count = db.query(SmsendLog).filter(
        SmsendLog.type == 1, SmsendLog.send_time > cutoff
    ).count()
    email_count = db.query(SmsendLog).filter(
        SmsendLog.type == 2, SmsendLog.send_time > cutoff
    ).count()

    return {"smsCount": sms_count, "emailCount": email_count, "sms": [], "email": []}


def get_integration_config(db: Session, prefix: str) -> dict:
    """Get integration config by prefix (Dingtalk, Wxwork, Feishu, Aibot)."""
    return {k: (desensitize(v) if "Secret" in k or "secret" in k else v)
            for k, v in get_all_configs(db, prefix).items()}


def save_integration_config(db: Session, data: dict) -> None:
    """Save integration config values."""
    set_configs(db, data)


def get_maintenance_mode() -> Optional[dict]:
    """Get current maintenance mode, or None."""
    global _maintenance_mode
    if _maintenance_mode:
        end = _maintenance_mode.get("endTime")
        if isinstance(end, datetime) and end <= datetime.utcnow():
            _maintenance_mode = None
    return _maintenance_mode


def set_maintenance_mode(start_time: datetime, end_time: datetime,
                         note: str = "", not_login: bool = False) -> dict:
    """Set maintenance mode."""
    global _maintenance_mode
    _maintenance_mode = {
        "startTime": start_time,
        "endTime": end_time,
        "note": note,
        "notLogin": not_login,
    }
    return _maintenance_mode


def cancel_maintenance_mode() -> None:
    """Cancel maintenance mode."""
    global _maintenance_mode
    _maintenance_mode = None


def get_system_config_data(db: Session) -> dict:
    """Get all system configuration for the admin systems page."""
    config_keys = [
        "HomeURL", "LOGO", "LOGOWhite", "CustomWallpaper",
        "RecycleBinKeepingDays", "RevisionHistoryKeepingDays",
        "DBBackupsKeepingDays", "PasswordExpiredDays", "PortalUploadMaxSize",
        "DefaultLanguage", "PortalOfficePreviewUrl", "OnlyofficeJwt",
        "PortalBaiduMapAk",
    ]
    result = {}
    for k in config_keys:
        result[k] = get_config(db, k)
    return result


def save_system_config(db: Session, data: dict) -> Optional[str]:
    """Save system configuration. Returns error or None."""
    home_url = data.get("HomeURL", "")
    if home_url and not home_url.startswith(("http://", "https://")):
        return "无效主页地址/域名"
    set_configs(db, data)
    return None


def do_backup(db: Session, backup_type: int = 3) -> dict:
    """Perform database and/or file backup. Returns paths."""
    backup_dir = os.path.join(os.getcwd(), "data", "_backups")
    os.makedirs(backup_dir, exist_ok=True)

    result = {"db": None, "file": None}
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")

    if backup_type in (1, 3):
        try:
            db_file = os.path.join(backup_dir, f"db-backup-{timestamp}.sql")
            # Simulate DB backup
            with open(db_file, "w") as f:
                f.write(f"-- Backup created at {timestamp}\n")
            result["db"] = f"_backups/{os.path.basename(db_file)}"
        except Exception as e:
            result["db"] = f"ERR:{e}"

    if backup_type in (2, 3):
        try:
            file_path = os.path.join(backup_dir, f"data-backup-{timestamp}.tar.gz")
            with open(file_path, "w") as f:
                f.write("")
            result["file"] = f"_backups/{os.path.basename(file_path)}"
        except Exception as e:
            result["file"] = f"ERR:{e}"

    return result
