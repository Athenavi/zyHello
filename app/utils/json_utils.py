"""JSON utility functions — replaces JSONUtils.java."""

from __future__ import annotations

import json
from typing import Any

# ── Sentinel constants ──────────────────────────────────────────────
EMPTY_OBJECT_STR = "{}"
EMPTY_ARRAY_STR = "[]"
EMPTY_OBJECT: dict = {}
EMPTY_ARRAY: list = []


def to_json_object(key: str, value: Any) -> dict:
    """Build a single-key JSON object."""
    return {key: value}


def to_json_object_from_arrays(keys: list[str], values: list[Any]) -> dict:
    """Build a JSON object from parallel key/value arrays."""
    if len(values) < len(keys):
        raise ValueError("K/V length mismatch")
    return {keys[i]: values[i] for i in range(len(keys))}


def to_json_object_array(keys: list[str], values_array: list[list[Any]]) -> list[dict]:
    """Build a list of JSON objects from keys + a 2-D values array."""
    result: list[dict] = []
    for row in values_array:
        result.append({keys[i]: row[i] for i in range(len(keys))})
    return result


def to_json_array(items: list[Any]) -> list:
    """Convert a list of objects that have ``.to_json()`` to a list of dicts."""
    if not items:
        return []
    return [item.to_json() if hasattr(item, "to_json") else item for item in items]


def clone(obj: Any) -> Any:
    """Deep-clone a JSON-compatible object via serialize/deserialize."""
    return json.loads(json.dumps(obj))


def pretty_print(obj: Any) -> str:
    """Pretty-print a JSON-compatible object."""
    return json.dumps(obj, indent=2, ensure_ascii=False, default=str)


def well_format(text: str) -> bool:
    """Quick check whether *text* looks like a JSON object or array."""
    if not text or not text.strip():
        return False
    text = text.strip()
    return (text.startswith("{") and text.endswith("}")) or (
        text.startswith("[") and text.endswith("]")
    )


def parse_object_safe(text: str) -> dict | None:
    """Parse *text* as a JSON object, returning ``None`` on failure."""
    try:
        return json.loads(text)
    except (json.JSONDecodeError, TypeError):
        return None


def dumps(obj: Any, **kwargs: Any) -> str:
    """json.dumps with sensible defaults."""
    kwargs.setdefault("ensure_ascii", False)
    kwargs.setdefault("default", str)
    return json.dumps(obj, **kwargs)


def loads(text: str, **kwargs: Any) -> Any:
    """json.loads wrapper."""
    return json.loads(text, **kwargs)
