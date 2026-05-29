"""
Token management — access tokens, CSRF tokens, once tokens.

Migrated from Java AuthTokenManager.java.
"""

from __future__ import annotations

import logging
import secrets
import time
from typing import Any

log = logging.getLogger(__name__)

# Token type constants
TYPE_ACCESS_TOKEN = "access_token"
TYPE_CSRF_TOKEN = "csrf_token"
TYPE_ONCE_TOKEN = "once_token"

# Default expiry (seconds)
ACCESSTOKEN_EXPIRES = 60 * 60 * 24  # 24 hours
CSRF_TOKEN_EXPIRES = 60 * 60 * 2     # 2 hours
ONCE_TOKEN_EXPIRES = 60              # 1 minute

# In-memory token store: token → (type, user_id, expire_ts)
_token_store: dict[str, tuple[str, str, float]] = {}


def _cleanup_expired() -> None:
    """Remove expired tokens (called lazily)."""
    now = time.time()
    expired = [k for k, v in _token_store.items() if v[2] < now]
    for k in expired:
        _token_store.pop(k, None)


def _generate_token(user_id: str, seconds: int, token_type: str) -> str:
    """Generate and store a new token."""
    _cleanup_expired()
    token = secrets.token_urlsafe(32)
    expire_ts = time.time() + seconds
    _token_store[token] = (token_type, user_id, expire_ts)
    log.debug("Generated %s token for user %s (expires in %ds)", token_type, user_id, seconds)
    return token


# -- Public API ------------------------------------------------------------

def generate_access_token(user_id: str) -> str:
    """Generate a long-lived access token."""
    return _generate_token(user_id, ACCESSTOKEN_EXPIRES, TYPE_ACCESS_TOKEN)


def generate_csrf_token(user_id: str) -> str:
    """Generate a CSRF token."""
    return _generate_token(user_id, CSRF_TOKEN_EXPIRES, TYPE_CSRF_TOKEN)


def generate_once_token(user_id: str) -> str:
    """Generate a one-time token (destroyed on first verification)."""
    return _generate_token(user_id, ONCE_TOKEN_EXPIRES, TYPE_ONCE_TOKEN)


def verify_token(
    token: str,
    verify_after_destroy: bool = False,
    verify_after_refresh: bool = False,
) -> str | None:
    """
    Verify a token and optionally destroy/refresh it.

    Returns the user_id if valid, None otherwise.
    """
    _cleanup_expired()
    entry = _token_store.get(token)
    if entry is None:
        return None

    token_type, user_id, _ = entry

    # Once tokens are always destroyed after verification
    if token_type == TYPE_ONCE_TOKEN:
        verify_after_destroy = True

    if verify_after_destroy:
        log.debug("Destroying %s token %s", token_type, token[:8])
        _token_store.pop(token, None)
        verify_after_refresh = False

    if verify_after_refresh and token_type == TYPE_ACCESS_TOKEN:
        new_expire = time.time() + ACCESSTOKEN_EXPIRES
        _token_store[token] = (token_type, user_id, new_expire)

    return user_id


def verify_token_simple(token: str) -> str | None:
    """Convenience: verify without destroy or refresh."""
    return verify_token(token, verify_after_destroy=False, verify_after_refresh=False)


def revoke_token(token: str) -> None:
    """Revoke a specific token."""
    _token_store.pop(token, None)


def revoke_user_tokens(user_id: str) -> int:
    """Revoke all tokens for a user. Returns count of revoked tokens."""
    to_remove = [k for k, v in _token_store.items() if v[1] == user_id]
    for k in to_remove:
        _token_store.pop(k, None)
    return len(to_remove)
