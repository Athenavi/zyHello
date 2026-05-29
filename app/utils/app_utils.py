"""
App-level utilities — Python equivalent of AppUtils.java.

Covers: context path, request user extraction, locale detection,
mobile detection, watermark text generation, header constants.
"""
from __future__ import annotations

import os
from typing import Optional

from starlette.requests import Request
from loguru import logger


# ── Header / Cookie / Session constants ───────────────────────────────────
HF_AUTHTOKEN = "X-AuthToken"
URL_AUTHTOKEN = "_authToken"

HF_CSRFTOKEN = "X-CsrfToken"
URL_CSRFTOKEN = "_csrfToken"

HF_ONCETOKEN = "X-OnceToken"
URL_ONCETOKEN = "_onceToken"

SK_LOCALE = "_LOCALE"
CK_LOCALE = "rb.locale"

HF_CLIENT = "X-Client"
HF_LOCALE = "X-ClientLocale"

UTF8 = "utf-8"


# ── Context path ──────────────────────────────────────────────────────────

def get_context_path(path: str = "") -> str:
    """Get the application context path (empty string by default for FastAPI)."""
    ctx = os.environ.get("CONTEXT_PATH", "")
    if path:
        if not path.startswith("/"):
            path = "/" + path
        return ctx + path
    return ctx


# ── Request user ──────────────────────────────────────────────────────────

def get_request_user(request: Request) -> Optional[str]:
    """
    Extract the current user ID from the request.
    Checks session first, then falls back to X-AuthToken header.
    """
    # From session (if using session middleware)
    user = request.session.get("_current_user") if hasattr(request, "session") else None
    if user:
        return str(user)

    # From auth token header
    token = request.headers.get(HF_AUTHTOKEN)
    if token:
        try:
            from app.services.auth_service import decode_access_token
            return decode_access_token(token)
        except Exception:
            logger.debug("Token verification failed")
    return None


# ── Locale detection ──────────────────────────────────────────────────────

def get_request_locale(request: Request, default_lang: str = "zh_CN") -> str:
    """
    Detect locale from: URL param → session → header → config default.
    """
    # In URL query params
    locale = request.query_params.get("locale")
    if locale:
        return locale

    # In session
    if hasattr(request, "session"):
        locale = request.session.get(SK_LOCALE)
        if locale:
            return locale

    # In header
    locale = request.headers.get(HF_LOCALE)
    if locale:
        return locale

    return default_lang


# ── Mobile detection ──────────────────────────────────────────────────────

def is_rb_mobile(request: Request) -> bool:
    """Check if this is an RB mobile client request."""
    ua = request.headers.get(HF_CLIENT, "")
    return ua.startswith("RB/Mobile-")


def is_mobile(request: Request) -> bool:
    """Check if the request is from a mobile device."""
    ua = request.headers.get("user-agent", "")
    return any(kw in ua for kw in ("Mobile", "iPhone", "Android"))


# ── Watermark ─────────────────────────────────────────────────────────────

def get_watermark_text(user_id: str | None = None, user_info: dict | None = None) -> str | None:
    """
    Generate watermark text from a format string.
    Supports placeholders: {USER}, {NAME}, {EMAIL}, {PHONE}, {SYS}
    """
    from app.config import settings

    wt = getattr(settings, "MARK_WATERMARK_FORMAT", None)
    if not wt:
        return None

    # Chinese → English alias
    wt = wt.replace("{用户}", "{USER}")
    wt = wt.replace("{姓名}", "{NAME}")
    wt = wt.replace("{邮箱}", "{EMAIL}")
    wt = wt.replace("{电话}", "{PHONE}")
    wt = wt.replace("{系统}", "{SYS}")

    info = user_info or {}
    if "{USER}" in wt and user_id:
        wt = wt.replace("{USER}", "***" + user_id[-7:] if len(user_id) > 7 else user_id)
    if "{NAME}" in wt:
        wt = wt.replace("{NAME}", info.get("full_name", ""))
    if "{EMAIL}" in wt:
        wt = wt.replace("{EMAIL}", info.get("email", ""))
    if "{PHONE}" in wt:
        wt = wt.replace("{PHONE}", info.get("phone", ""))
    if "{SYS}" in wt:
        wt = wt.replace("{SYS}", "REBUILD")

    return wt.strip()
