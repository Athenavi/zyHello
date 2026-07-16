"""
Common utilities — Python equivalent of CommonsUtils.java.

Covers: HTML escaping, SQL escaping, sanitization, plain-text checks,
special-char detection, max-length truncation, UUID generation, resource loading.
"""
from __future__ import annotations

import os
import re
import uuid
import html as _html
import secrets
from pathlib import Path
from urllib.parse import quote

from loguru import logger


# ── constants ──────────────────────────────────────────────────────────────
COMM_SPLITER = "$$$$"
COMM_SPLITER_RE = r"\$\$\$\$"

_PATT_PLAINTEXT = re.compile(r"[A-Za-z0-9_\-\u4e00-\u9fa5]+")
_SPECIAL_CHARS = set("`~!@#$%^&*()_+=-{}|[];':\",./<>?")


# ── text helpers ───────────────────────────────────────────────────────────

def is_plain_text(text: str) -> bool:
    """Only digits, letters, Chinese chars, `_`, `-` (no spaces)."""
    return " " not in text and _PATT_PLAINTEXT.fullmatch(text) is not None


def is_special_char(ch: str) -> bool:
    return ch in _SPECIAL_CHARS


def maxstr(text: str | None, max_length: int) -> str | None:
    if text is None:
        return None
    return text[:max_length] if len(text) > max_length else text


# ── HTML / SQL escaping ───────────────────────────────────────────────────

def escape_html(text) -> str:
    """Escape `"` `'` `>` `<` — mirrors CommonsUtils.escapeHtml."""
    if text is None:
        return ""
    s = str(text)
    if not s.strip():
        return ""
    return _html.escape(s, quote=True)


def unescape_html(text: str) -> str:
    """Reverse of escape_html."""
    return _html.unescape(text)


_SANITIZE_PATTERNS = [
    (re.compile(r"(?i)</?script[^>]*>", re.IGNORECASE), ""),
    (re.compile(r"(?i)</?style[^>]*>", re.IGNORECASE), ""),
    (re.compile(r"(?i)</?iframe[^>]*>", re.IGNORECASE), ""),
    (re.compile(r"(?i)<img\s[^>]*>", re.IGNORECASE), ""),
]


def sanitize_html(text) -> str:
    """Strip dangerous HTML tags (script/style/iframe/img)."""
    if text is None:
        return ""
    s = str(text)
    if not s.strip():
        return ""
    for pat, repl in _SANITIZE_PATTERNS:
        s = pat.sub(repl, s)
    return s


def escape_sql(text) -> str:
    """Basic SQL escaping: backslash single-quotes and backslashes."""
    s = str(text).replace("\\'", "'").replace("\\", "\\\\")
    return s.replace("'", "''")


# ── resources ──────────────────────────────────────────────────────────────

_APP_DIR = Path(__file__).resolve().parent.parent  # app/

def get_stream_of_res(file_path: str) -> bytes | None:
    """Read a resource file relative to the project root."""
    p = _APP_DIR.parent / file_path
    if not p.exists():
        p = _APP_DIR / file_path
    if p.exists():
        return p.read_bytes()
    logger.error("Cannot load resource file: {}", file_path)
    return None


def get_string_of_res(file_path: str, encoding: str = "utf-8") -> str | None:
    """Read a resource file as string."""
    data = get_stream_of_res(file_path)
    if data is not None:
        return data.decode(encoding)
    return None


# ── random / token ────────────────────────────────────────────────────────

def random_string(length: int = 16) -> str:
    """Generate a random alphanumeric string."""
    return secrets.token_hex(length // 2)[:length]


def quick_guid() -> str:
    """Generate a UUID v4 string (no dashes)."""
    return uuid.uuid4().hex
