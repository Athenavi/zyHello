"""Record JSON codec — replaces codec/RbRecordCodec.java.

Provides serialisation helpers for database record objects to JSON.
"""

from __future__ import annotations

from typing import Any

from app.utils.json_utils import to_json_object_from_arrays


def record_to_json(record: Any, fields: list[str] | None = None) -> dict:
    """Convert a SQLAlchemy model instance (or dict) to a JSON-safe dict.

    * *record* — a SQLAlchemy model instance or plain dict.
    * *fields* — if given, only include these columns.
    """
    if isinstance(record, dict):
        if fields:
            return {k: _safe_value(record.get(k)) for k in fields}
        return {k: _safe_value(v) for k, v in record.items()}

    # SQLAlchemy model
    columns = fields or [c.name for c in record.__table__.columns]
    return {col: _safe_value(getattr(record, col, None)) for col in columns}


def records_to_json(records: list[Any], fields: list[str] | None = None) -> list[dict]:
    """Batch convert a list of records."""
    return [record_to_json(r, fields) for r in records]


def _safe_value(val: Any) -> Any:
    """Make a value JSON-safe."""
    if val is None:
        return None
    if isinstance(val, (str, int, float, bool)):
        return val
    if isinstance(val, (list, tuple)):
        return [_safe_value(v) for v in val]
    if isinstance(val, dict):
        return {k: _safe_value(v) for k, v in val.items()}
    # date/datetime handled by date_codec
    if hasattr(val, "isoformat"):
        return val.isoformat()
    return str(val)
