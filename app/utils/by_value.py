"""Simple value-extraction callback — replaces ByValue.java.

In Java this is a functional interface.  In Python, just pass a lambda / callable.
"""

from __future__ import annotations

from typing import Any, Callable, Protocol, runtime_checkable


@runtime_checkable
class ByValue(Protocol):
    """Protocol matching Java's ``ByValue`` interface."""

    def value(self, obj: Any) -> Any:
        """Extract a value from *obj*."""
        ...


def by_value(func: Callable[[Any], Any]) -> Callable[[Any], Any]:
    """Identity wrapper — returns *func* unchanged.  Exists for API clarity."""
    return func


def sort_by_value(items: list, key_func: Callable[[Any], Any], reverse: bool = False) -> list:
    """Sort *items* by the value extracted via *key_func* (Chinese-safe collation)."""
    import locale

    # Try to use locale-aware collation for CJK sorting
    try:
        locale.setlocale(locale.LC_COLLATE, "zh_CN.UTF-8")
    except locale.Error:
        pass

    return sorted(items, key=lambda x: str(key_func(x)), reverse=reverse)
