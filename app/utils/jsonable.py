"""JSON-aware protocol — replaces JSONable.java.

In Python this is simply a protocol (duck-typing) — any object with a ``to_json()`` method qualifies.
"""

from __future__ import annotations

import json
from typing import Any, Protocol, runtime_checkable


@runtime_checkable
class JSONable(Protocol):
    """Protocol for objects that can serialise themselves to JSON."""

    def to_json(self) -> Any:
        """Return a JSON-serialisable representation."""
        ...

    def to_json_string(self) -> str:
        """Return a JSON string."""
        ...


class JSONMixin:
    """Mixin providing default ``to_json_string`` from ``to_json``."""

    def to_json(self) -> Any:
        raise NotImplementedError

    def to_json_string(self) -> str:
        return json.dumps(self.to_json(), ensure_ascii=False, default=str)
