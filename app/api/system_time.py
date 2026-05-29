"""
System time reference API.

Migrated from Java SystemTime.java.
"""

from datetime import datetime, timezone

from app.api.base import BaseApi
from app.api.context import ApiContext


class SystemTime(BaseApi):
    """Returns the current system time (UTC)."""

    def get_api_name(self) -> str:
        return "SystemTime"

    def execute(self, context: ApiContext) -> dict:
        now = datetime.now(timezone.utc)
        return self.format_success({
            "time": now.isoformat(),
            "timestamp": int(now.timestamp()),
        })
