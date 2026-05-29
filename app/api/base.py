"""
Base API abstract class.

Migrated from Java BaseApi.java.
"""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from typing import Any

from app.api.controller import Controller
from app.api.context import ApiContext

log = logging.getLogger(__name__)


class BaseApi(Controller, ABC):
    """Abstract base for all OpenAPI endpoint handlers."""

    def get_api_name(self) -> str:
        """Return the API name. Defaults to the class name in snake_case."""
        name = self.__class__.__name__
        # Convert CamelCase to snake_case
        import re
        s1 = re.sub(r"(.)([A-Z][a-z]+)", r"\1_\2", name)
        return re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", s1).lower()

    @abstractmethod
    def execute(self, context: ApiContext) -> dict:
        """Execute the API and return a result dict."""
        ...

    def execute_safe(self, context: ApiContext) -> dict:
        """Execute with error handling; returns formatted error on failure."""
        try:
            return self.execute(context)
        except Exception as exc:
            log.exception("API execution error: %s", self.get_api_name())
            return self.format_failure(str(exc))
