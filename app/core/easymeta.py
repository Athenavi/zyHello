"""Field type system — DisplayType enum and EasyField abstraction.
Migrated from Java: DisplayType, EasyField, EasyEntity, EasyMetaFactory, BaseEasyMeta,
EasyText, EasyNumber, EasyDate, EasyDateTime, EasyBool, EasyPickList, EasyMultiSelect,
EasyClassification, EasyReference, EasyN2NReference, EasyFile, EasyImage, EasyAvatar,
EasyBarCode, EasySeries, EasyState, EasyTag, EasySign, EasyLocation, EasyPhone,
EasyEmail, EasyUrl, EasyTime, EasyDecimal, EasyNText, EasyID, EasyAnyReference,
MixValue, MultiValue, MediaValue, PatternValue.
"""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from datetime import datetime, date, time
from enum import Enum
from typing import Any, Optional

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# DisplayType — field display type enum
# ---------------------------------------------------------------------------

class DisplayType(Enum):
    """All supported field display types in the system."""
    TEXT = ("Text", str, "TEXT")
    NTEXT = ("NText", str, "TEXT")
    NUMBER = ("Number", (int, float), "DECIMAL(18,2)")
    DECIMAL = ("Decimal", (int, float), "DECIMAL(18,8)")
    DATE = ("Date", (date, datetime), "DATE")
    DATETIME = ("DateTime", datetime, "DATETIME")
    TIME = ("Time", time, "TIME")
    BOOL = ("Bool", bool, "BOOL")
    PICKLIST = ("PickList", str, "TEXT")
    MULTISELECT = ("MultiSelect", str, "TEXT")
    CLASSIFICATION = ("Classification", str, "TEXT")
    REFERENCE = ("Reference", str, "CHAR(20)")
    N2NREFERENCE = ("N2NReference", list, "TEXT")
    ANYREFERENCE = ("AnyReference", str, "CHAR(20)")
    FILE = ("File", list, "TEXT")
    IMAGE = ("Image", list, "TEXT")
    AVATAR = ("Avatar", str, "TEXT")
    BARCODE = ("BarCode", str, "TEXT")
    SERIES = ("Series", str, "TEXT")
    STATE = ("State", int, "INT")
    TAG = ("Tag", list, "TEXT")
    SIGN = ("Sign", str, "TEXT")
    LOCATION = ("Location", str, "TEXT")
    PHONE = ("Phone", str, "TEXT")
    EMAIL = ("Email", str, "TEXT")
    URL = ("URL", str, "TEXT")
    ID = ("ID", str, "CHAR(20)")

    def __init__(self, display_name: str, python_type, db_type: str):
        self._display_name = display_name
        self._python_type = python_type
        self._db_type = db_type

    @property
    def display_name(self) -> str:
        return self._display_name

    @property
    def python_type(self):
        return self._python_type

    @property
    def db_type(self) -> str:
        return self._db_type


# ---------------------------------------------------------------------------
# Base metadata wrapper
# ---------------------------------------------------------------------------

class BaseEasyMeta:
    """Base class for all easy-meta wrappers."""

    def __init__(self, raw_meta: dict):
        self._raw = raw_meta or {}

    @property
    def raw_meta(self) -> dict:
        return self._raw

    def get_name(self) -> str:
        return self._raw.get("name", "")

    def get_label(self) -> str:
        return self._raw.get("label", self.get_name())

    def is_creatable(self) -> bool:
        return self._raw.get("creatable", True)

    def is_updatable(self) -> bool:
        return self._raw.get("updatable", True)

    def is_queryable(self) -> bool:
        return self._raw.get("queryable", True)

    def is_nullable(self) -> bool:
        return self._raw.get("nullable", True)

    def is_repeatable(self) -> bool:
        return self._raw.get("repeatable", False)

    def is_builtin(self) -> bool:
        return self._raw.get("builtin", False)

    def to_dict(self) -> dict:
        return dict(self._raw)


# ---------------------------------------------------------------------------
# EasyEntity — entity wrapper
# ---------------------------------------------------------------------------

class EasyEntity(BaseEasyMeta):
    """Entity metadata wrapper."""

    def __init__(self, raw_meta: dict):
        super().__init__(raw_meta)

    @property
    def name_field(self) -> Optional[str]:
        """Return the name/display field for this entity."""
        return self._raw.get("nameField")


# ---------------------------------------------------------------------------
# EasyField — field wrapper
# ---------------------------------------------------------------------------

class EasyField(BaseEasyMeta):
    """Field metadata wrapper with display type awareness."""

    def __init__(self, raw_meta: dict, display_type: DisplayType = None):
        super().__init__(raw_meta)
        self._display_type = display_type or self._resolve_display_type()

    def _resolve_display_type(self) -> DisplayType:
        dt_name = self._raw.get("displayType") or self._raw.get("type", "TEXT")
        try:
            return DisplayType[dt_name.upper()]
        except KeyError:
            return DisplayType.TEXT

    @property
    def display_type(self) -> DisplayType:
        return self._display_type

    def get_display_type_label(self, full_name: bool = False) -> str:
        dt = self._display_type
        if full_name:
            return f"{dt.display_name} ({dt.name})"
        return dt.name

    def is_builtin(self) -> bool:
        if super().is_builtin():
            return True
        return self._raw.get("builtin", False)

    def to_dict(self) -> dict:
        d = super().to_dict()
        d["displayType"] = self._display_type.name
        d["displayTypeName"] = self._display_type.display_name
        return d

    def convert_compatible_value(self, value: Any, target_field: EasyField) -> Any:
        """Convert value to be compatible with the target field type."""
        if value is None:
            return None
        target_dt = target_field.display_type
        # Convert to text types
        if target_dt in (DisplayType.TEXT, DisplayType.NTEXT):
            return self.get_text(value)
        # Same type — no conversion needed
        if self._display_type == target_dt:
            return value
        # Default: string conversion
        return str(value) if value is not None else None

    def get_text(self, value: Any) -> str:
        """Get text representation of value."""
        if value is None:
            return ""
        if isinstance(value, list):
            return ", ".join(str(v) for v in value)
        return str(value)

    def wrap_value(self, value: Any) -> Any:
        """Wrap raw database value for display/API response."""
        if value is None:
            return None
        dt = self._display_type

        if dt == DisplayType.BOOL:
            if isinstance(value, str):
                return value.lower() in ("1", "true", "yes")
            return bool(value)

        if dt in (DisplayType.NUMBER, DisplayType.DECIMAL):
            try:
                if isinstance(value, str):
                    value = value.replace(",", "")
                return float(value) if "." in str(value) else int(float(value))
            except (ValueError, TypeError):
                return value

        if dt in (DisplayType.DATE, DisplayType.DATETIME):
            if isinstance(value, str):
                return value
            if isinstance(value, (date, datetime)):
                return value.isoformat()
            return str(value)

        if dt == DisplayType.MULTISELECT:
            if isinstance(value, str):
                return [v.strip() for v in value.split(",") if v.strip()]
            return value if isinstance(value, list) else [value]

        if dt in (DisplayType.FILE, DisplayType.IMAGE, DisplayType.TAG):
            if isinstance(value, str):
                try:
                    parsed = json.loads(value)
                    return parsed if isinstance(parsed, list) else [parsed]
                except (json.JSONDecodeError, TypeError):
                    return [value] if value else []
            return value if isinstance(value, list) else []

        if dt == DisplayType.REFERENCE:
            if isinstance(value, str):
                return value
            return str(value)

        if dt == DisplayType.N2NREFERENCE:
            if isinstance(value, str):
                try:
                    parsed = json.loads(value)
                    return parsed if isinstance(parsed, list) else [parsed]
                except (json.JSONDecodeError, TypeError):
                    return [v.strip() for v in value.split(",") if v.strip()]
            return value if isinstance(value, list) else []

        # Default: return as-is or convert to string
        return value


# ---------------------------------------------------------------------------
# MixValue, MultiValue, MediaValue, PatternValue — composite value wrappers
# ---------------------------------------------------------------------------

@dataclass
class MixValue:
    """Mixed value with label and ID reference."""
    id: str = ""
    text: str = ""
    extra: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        d = {"id": self.id, "text": self.text}
        if self.extra:
            d.update(self.extra)
        return d


@dataclass
class MultiValue:
    """Multiple selection value."""
    values: list[str] = field(default_factory=list)
    labels: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {"values": self.values, "labels": self.labels}


@dataclass
class MediaValue:
    """Media file value (file/image/avatar)."""
    file_id: str = ""
    file_name: str = ""
    file_path: str = ""
    file_size: int = 0
    file_type: str = ""

    def to_dict(self) -> dict:
        return {
            "fileId": self.file_id,
            "fileName": self.file_name,
            "filePath": self.file_path,
            "fileSize": self.file_size,
            "fileType": self.file_type,
        }


@dataclass
class PatternValue:
    """Pattern-validated value (phone, email, URL, etc.)."""
    value: str = ""
    pattern: str = ""
    valid: bool = True

    def to_dict(self) -> dict:
        return {"value": self.value, "pattern": self.pattern, "valid": self.valid}


# ---------------------------------------------------------------------------
# EasyMetaFactory — factory for creating EasyField / EasyEntity instances
# ---------------------------------------------------------------------------

class EasyMetaFactory:
    """Factory for creating EasyField and EasyEntity instances."""

    @staticmethod
    def value_of_field(field_meta: dict) -> EasyField:
        """Create an EasyField from a field metadata dict."""
        if not field_meta:
            raise ValueError("Field metadata cannot be None")
        display_type_name = field_meta.get("displayType") or field_meta.get("type", "TEXT")
        try:
            dt = DisplayType[display_type_name.upper()]
        except KeyError:
            logger.warning("Unknown display type '%s', defaulting to TEXT", display_type_name)
            dt = DisplayType.TEXT
        return EasyField(field_meta, dt)

    @staticmethod
    def value_of_entity(entity_meta: dict) -> EasyEntity:
        """Create an EasyEntity from an entity metadata dict."""
        if not entity_meta:
            raise ValueError("Entity metadata cannot be None")
        return EasyEntity(entity_meta)

    @staticmethod
    def get_display_type(field_meta: dict) -> DisplayType:
        """Resolve DisplayType from field metadata."""
        display_type_name = field_meta.get("displayType") or field_meta.get("type", "TEXT")
        try:
            return DisplayType[display_type_name.upper()]
        except KeyError:
            return DisplayType.TEXT

    @staticmethod
    def convert_builtin_field_type(db_type: str) -> DisplayType:
        """Convert a database column type to a DisplayType."""
        mapping = {
            "VARCHAR": DisplayType.TEXT,
            "CHAR": DisplayType.TEXT,
            "TEXT": DisplayType.NTEXT,
            "INT": DisplayType.NUMBER,
            "INTEGER": DisplayType.NUMBER,
            "BIGINT": DisplayType.NUMBER,
            "DECIMAL": DisplayType.DECIMAL,
            "FLOAT": DisplayType.DECIMAL,
            "DOUBLE": DisplayType.DECIMAL,
            "DATE": DisplayType.DATE,
            "DATETIME": DisplayType.DATETIME,
            "TIMESTAMP": DisplayType.DATETIME,
            "TIME": DisplayType.TIME,
            "BOOL": DisplayType.BOOL,
            "BOOLEAN": DisplayType.BOOL,
        }
        db_type_upper = db_type.upper().split("(")[0].strip()
        return mapping.get(db_type_upper, DisplayType.TEXT)


def wrap_field_value(value: Any, field_meta: dict) -> Any:
    """Convenience function: wrap a raw value using the field's display type."""
    if value is None or not field_meta:
        return value
    ef = EasyMetaFactory.value_of_field(field_meta)
    return ef.wrap_value(value)
