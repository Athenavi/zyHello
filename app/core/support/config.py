"""System configuration — KV storage and RebuildConfiguration.

Migrated from Java: com.rebuild.core.support.KVStorage,
com.rebuild.core.support.RebuildConfiguration,
com.rebuild.core.support.ConfigurationItem.
Provides global system config access backed by the SystemConfig DB table.
"""
from __future__ import annotations

import logging
import os
from enum import Enum
from pathlib import Path
from typing import Any, Optional

log = logging.getLogger(__name__)


# ── ConfigurationItem enum (mirrors Java ConfigurationItem) ─────────────────

class ConfigurationItem(str, Enum):
    """System configuration keys with optional defaults."""
    # Data / paths
    DataDirectory = "DataDirectory"
    # Home / URLs
    HomeURL = "HomeURL"
    MobileUrl = "MobileUrl"
    # Storage
    StorageApiKey = "StorageApiKey"
    StorageApiSecret = "StorageApiSecret"
    StorageBucket = "StorageBucket"
    StorageURL = "StorageURL"
    # Mail
    MailUser = "MailUser"
    MailPassword = "MailPassword"
    MailAddr = "MailAddr"
    MailName = "MailName"
    MailCc = "MailCc"
    MailBcc = "MailBcc"
    MailSmtpServer = "MailSmtpServer"
    # SMS
    SmsUser = "SmsUser"
    SmsPassword = "SmsPassword"
    SmsSign = "SmsSign"
    # i18n
    DefaultLanguage = "DefaultLanguage"
    # Security
    SecurityEnhanced = "SecurityEnhanced"
    # License
    SN = "SN"
    # Redis
    RedisDatabase = "RedisDatabase"
    # Misc
    MaintenanceMode = "MaintenanceMode"

    # JVM-arg-only items (cannot be set via API)
    _JVM_ARGS = frozenset({"DataDirectory", "RedisDatabase", "SN"})

    @classmethod
    def in_jvm_args(cls, name: str) -> bool:
        return name in cls._JVM_ARGS

    def get_default(self) -> Any:
        """Return default value for this config item."""
        defaults = {
            "HomeURL": "http://localhost:18080",
            "DefaultLanguage": "zh_CN",
            "SecurityEnhanced": False,
        }
        return defaults.get(self.value)


# ── In-memory KV cache ──────────────────────────────────────────────────────

_cache: dict[str, str] = {}


def _load_from_db(key: str, no_cache: bool = False) -> Optional[str]:
    """Load a config value from the SystemConfig table."""
    if not no_cache and key in _cache:
        return _cache[key]

    try:
        from sqlalchemy import text
        from app.database import SessionLocal
        with SessionLocal() as db:
            row = db.execute(
                text("SELECT value FROM system_config WHERE item = :item"),
                {"item": key},
            ).fetchone()
            val = row[0] if row else None
            if val is not None:
                _cache[key] = val
            return val
    except Exception:
        return None


def _save_to_db(key: str, value: Any) -> None:
    """Upsert a config value in the SystemConfig table."""
    try:
        from sqlalchemy import text
        from app.database import SessionLocal
        str_val = str(value) if value is not None else None
        with SessionLocal() as db:
            existing = db.execute(
                text("SELECT auto_id FROM system_config WHERE item = :item"),
                {"item": key},
            ).fetchone()
            if existing:
                db.execute(
                    text("UPDATE system_config SET value = :value WHERE item = :item"),
                    {"value": str_val, "item": key},
                )
            else:
                db.execute(
                    text("INSERT INTO system_config (item, value) VALUES (:item, :value)"),
                    {"item": key, "value": str_val},
                )
            db.commit()
            _cache[key] = str_val
    except Exception as e:
        log.error("Failed to save config %s: %s", key, e)


# ── KVStorage (base) ────────────────────────────────────────────────────────

CUSTOM_PREFIX = "custom."


def get_custom_value(key: str) -> Optional[str]:
    """Get a custom config value."""
    return get_value(CUSTOM_PREFIX + key, False, None)


def set_custom_value(key: str, value: Any) -> None:
    """Set a custom config value."""
    set_value(CUSTOM_PREFIX + key, value)


def remove_custom_value(key: str) -> None:
    """Remove a custom config value."""
    set_value(CUSTOM_PREFIX + key, None)


def get_value(key: str, no_cache: bool = False, default: Any = None) -> Optional[str]:
    """Get a config value by key."""
    val = _load_from_db(key, no_cache)
    return val if val is not None else default


def set_value(key: str, value: Any) -> None:
    """Set a config value."""
    _save_to_db(key, value)


def clear_cache() -> None:
    """Clear the in-memory config cache."""
    _cache.clear()


# ── RebuildConfiguration ────────────────────────────────────────────────────

def get_config(item: ConfigurationItem, no_cache: bool = False) -> Optional[str]:
    """Get a typed configuration value."""
    return get_value(item.value, no_cache, item.get_default())


def get_config_int(item: ConfigurationItem) -> int:
    val = get_config(item)
    if val is None:
        d = item.get_default()
        return int(d) if d is not None else 0
    try:
        return int(val)
    except (ValueError, TypeError):
        return 0


def get_config_long(item: ConfigurationItem) -> int:
    return get_config_int(item)


def get_config_bool(item: ConfigurationItem) -> bool:
    val = get_config(item)
    if val is None:
        d = item.get_default()
        return bool(d) if d is not None else False
    return str(val).lower() in ("true", "1", "yes")


def set_config(item: ConfigurationItem, value: Any) -> None:
    """Set a typed configuration value."""
    if ConfigurationItem.in_jvm_args(item.value):
        if item == ConfigurationItem.SN:
            # SN can only be set before application is ready
            pass  # allow for now
        else:
            raise SecurityException(f"Attack configuration detected : {item}={value}")
    set_value(item.value, value)


# ── File / Directory helpers ────────────────────────────────────────────────

def _check_safe_path(filepath: str) -> None:
    """Validate file path does not contain traversal sequences."""
    if ".." in filepath or filepath.startswith("/"):
        raise ValueError(f"Unsafe file path: {filepath}")


def get_file_of_data(filepath: Optional[str] = None) -> Path:
    """Get file/directory path under the RB data directory."""
    if filepath:
        _check_safe_path(filepath)

    d = get_config(ConfigurationItem.DataDirectory)
    if d:
        data_dir = Path(d)
    else:
        data_dir = Path.home() / ".rebuild"

    data_dir.mkdir(parents=True, exist_ok=True)

    if filepath is None:
        return data_dir
    return data_dir / filepath


def get_file_of_temp(filepath: Optional[str] = None) -> Path:
    """Get file/directory path under the RB temp directory."""
    if filepath:
        _check_safe_path(filepath)

    temp = get_file_of_data("temp")
    temp.mkdir(parents=True, exist_ok=True)

    if filepath is None:
        return temp
    return temp / filepath


# ── Account helpers ─────────────────────────────────────────────────────────

def get_storage_url() -> Optional[str]:
    """Cloud storage URL."""
    account = get_storage_account()
    return account[3] if account else None


def get_storage_account() -> Optional[list[str]]:
    """Cloud storage account: [ApiKey, ApiSecret, Bucket, URL]."""
    return _get_no_unset(True, [
        ConfigurationItem.StorageApiKey,
        ConfigurationItem.StorageApiSecret,
        ConfigurationItem.StorageBucket,
        ConfigurationItem.StorageURL,
    ])


def get_mail_account() -> Optional[list[str]]:
    """Mail account: [User, Password, Addr, Name, Cc, Bcc, SmtpServer]."""
    base = _get_no_unset(False, [
        ConfigurationItem.MailUser,
        ConfigurationItem.MailPassword,
        ConfigurationItem.MailAddr,
        ConfigurationItem.MailName,
    ])
    if base is None:
        return None
    cc = get_config(ConfigurationItem.MailCc)
    bcc = get_config(ConfigurationItem.MailBcc)
    smtp = get_config(ConfigurationItem.MailSmtpServer)
    return base + [cc or None, bcc or None, smtp or None]


def get_sms_account() -> Optional[list[str]]:
    """SMS account: [User, Password, Sign]."""
    return _get_no_unset(False, [
        ConfigurationItem.SmsUser,
        ConfigurationItem.SmsPassword,
        ConfigurationItem.SmsSign,
    ])


def get_home_url(path: Optional[str] = None) -> str:
    """Get absolute home URL, optionally appending a path."""
    home_url = get_config(ConfigurationItem.HomeURL) or "http://localhost:18080"
    if path:
        return _join_path(home_url, path)
    if not home_url.endswith("/"):
        home_url += "/"
    return home_url


def get_mobile_url(path: Optional[str] = None) -> str:
    """Get mobile URL."""
    mobile_url = os.environ.get("MobileUrl")
    if mobile_url:
        return _join_path(mobile_url, path) if path else mobile_url
    mobile_url = "/h5app/"
    if path:
        mobile_url = _join_path(mobile_url, path)
    return get_home_url(mobile_url)


# ── Internal helpers ────────────────────────────────────────────────────────

def _join_path(path1: str, path2: str) -> str:
    if path1.endswith("/"):
        path1 = path1[:-1]
    if path2.startswith("/"):
        path2 = path2[1:]
    return f"{path1}/{path2}"


def _get_no_unset(no_cache: bool, items: list[ConfigurationItem]) -> Optional[list[str]]:
    """Get multiple config values; returns None if any is blank."""
    result = []
    for item in items:
        v = get_value(item.value, no_cache, item.get_default())
        if not v:
            return None
        result.append(v)
    return result


class SecurityException(Exception):
    """Raised when a restricted config is modified."""
    pass
