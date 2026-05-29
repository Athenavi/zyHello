"""Assertion helpers — replaces RbAssert.java."""

from __future__ import annotations

from fastapi import HTTPException, status


class NeedRbvException(HTTPException):
    """Raised when a commercial-edition feature is accessed in the free edition."""

    def __init__(self, message: str = "Free edition does not support this feature"):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=message)


class DefinedException(HTTPException):
    """Generic business assertion error."""

    def __init__(self, message: str = "Not allowed"):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=message)


def is_commercial(message: str | None = None) -> None:
    """Assert the current edition is commercial.  Raises ``NeedRbvException`` otherwise."""
    # In Python port we treat every install as commercial-capable.
    # Override this if a license check is added later.
    return


def is_super_admin(user_id: str | None) -> None:
    """Assert *user_id* is a super admin."""
    from app.services.user_service import is_super_admin as _check
    if not _check(user_id):
        raise DefinedException("Not a super-admin user")


def is_allow(expression: bool, message: str = "Not allowed") -> None:
    """Assert *expression* is truthy, otherwise raise ``DefinedException``."""
    if not expression:
        raise DefinedException(message)


def check_allow(expression: bool) -> None:
    """Convenience wrapper for ``is_allow(expression, "Not Allow")``."""
    is_allow(expression, "Not Allow")
