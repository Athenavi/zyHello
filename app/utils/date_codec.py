"""Date JSON codec — replaces codec/RbDateCodec.java.

Provides custom date/datetime serialisation for JSON output.
"""

from __future__ import annotations

from datetime import date, datetime, time
from typing import Any


def date_serializer(obj: Any) -> str | Any:
    """json.dumps ``default`` handler for date/datetime objects."""
    if isinstance(obj, datetime):
        return obj.strftime("%Y-%m-%d %H:%M:%S")
    if isinstance(obj, date):
        return obj.strftime("%Y-%m-%d")
    if isinstance(obj, time):
        return obj.strftime("%H:%M:%S")
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")


def format_timestamp(ts: int | float, fmt: str = "%Y-%m-%d %H:%M:%S") -> str:
    """Format a Unix timestamp."""
    from datetime import timezone
    return datetime.fromtimestamp(ts / 1000 if ts > 1e12 else ts, tz=timezone.utc).strftime(fmt)


def parse_date(source: str) -> datetime | None:
    """Try to parse a date string in common formats."""
    formats = [
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%d",
        "%Y/%m/%d",
        "%d/%m/%Y",
        "%m/%d/%Y",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(source, fmt)
        except ValueError:
            continue
    return None
