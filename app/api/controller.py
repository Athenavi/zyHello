"""
Base controller with standard response formatters.

Migrated from Java Controller.java.
"""

from __future__ import annotations

from typing import Any


class Controller:
    """Base class providing unified response formatting."""

    CODE_OK = 0
    CODE_ERROR = 400
    CODE_SERV_ERROR = 500

    @staticmethod
    def format_success(data: Any = None) -> dict:
        body: dict[str, Any] = {"error_code": Controller.CODE_OK}
        if data is not None:
            body["data"] = data
        return body

    @staticmethod
    def format_failure(error_msg: str, error_code: int = CODE_ERROR) -> dict:
        return {
            "error_code": error_code,
            "error_msg": error_msg or "Uncaught error",
        }
