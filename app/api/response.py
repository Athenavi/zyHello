"""
Unified API response body.

Migrated from Java RespBody.java.
"""

from __future__ import annotations

from typing import Any

from app.api.controller import Controller


class RespBody:
    """Unified response wrapper for OpenAPI endpoints."""

    def __init__(self, error_code: int = Controller.CODE_OK, error_msg: str | None = None, data: Any = None):
        self.error_code = error_code
        self.error_msg = error_msg
        self.data = data

    # -- Factory methods ---------------------------------------------------

    @classmethod
    def ok(cls, data: Any = None) -> RespBody:
        return cls(Controller.CODE_OK, data=data)

    @classmethod
    def error(cls, error_msg: str, error_code: int = Controller.CODE_ERROR) -> RespBody:
        return cls(error_code, error_msg=error_msg)

    @classmethod
    def error_from_exception(cls, exc: Exception) -> RespBody:
        from app.api.exceptions import ApiInvokeException

        if isinstance(exc, ApiInvokeException):
            return cls(exc.get_error_code(), error_msg=exc.get_error_msg())
        return cls(Controller.CODE_ERROR, error_msg=str(exc))

    # -- Serialization -----------------------------------------------------

    def to_dict(self) -> dict:
        body: dict[str, Any] = {"error_code": self.error_code}
        if self.error_msg:
            body["error_msg"] = self.error_msg
        if self.data is not None:
            body["data"] = self.data
        return body

    def __repr__(self) -> str:
        return f"RespBody(code={self.error_code}, msg={self.error_msg!r})"
