"""
API request context.

Migrated from Java ApiContext.java.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from app.api.exceptions import ApiInvokeException


@dataclass
class ApiContext:
    """Encapsulates all data for a single API request."""

    parameter_map: dict[str, str] = field(default_factory=dict)
    post_data: dict | list | None = None
    app_id: str | None = None
    bind_user: str | None = None

    # -- Parameter helpers ------------------------------------------------

    def get_parameter(self, name: str) -> str | None:
        return self.parameter_map.get(name)

    def get_parameter_not_blank(self, name: str) -> str:
        """Return parameter value or raise ``ApiInvokeException``."""
        v = self.parameter_map.get(name)
        if v is None or (isinstance(v, str) and not v.strip()):
            raise ApiInvokeException(
                f"Parameter [{name}] cannot be blank",
                error_code=ApiInvokeException.ERR_BADPARAMS,
            )
        return v

    def get_parameter_as_id(self, name: str) -> str | None:
        v = self.parameter_map.get(name)
        if v and len(v) >= 20:
            return v
        return None

    def get_parameter_as_int(self, name: str, default: int = 0) -> int:
        v = self.parameter_map.get(name)
        if v is None:
            return default
        try:
            return int(v)
        except (ValueError, TypeError):
            return default

    def get_parameter_as_bool(self, name: str, default: bool = False) -> bool:
        v = self.parameter_map.get(name)
        if v is None:
            return default
        return v.lower() in ("true", "1", "yes")

    # -- Convenience -------------------------------------------------------

    def get_app_id(self) -> str | None:
        return self.app_id

    def get_bind_user(self) -> str | None:
        return self.bind_user

    def get_post_data(self) -> dict | list | None:
        return self.post_data
