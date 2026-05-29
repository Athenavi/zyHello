"""HTTP client utilities — replaces OkHttpUtils.java using httpx."""

from __future__ import annotations

import logging
import platform
import time
from pathlib import Path
from typing import Any

import httpx

from app.utils.commons import random_string

log = logging.getLogger(__name__)

# ── User-Agent / language ───────────────────────────────────────────
import locale as _locale

RB_UA = f"RB/Python ({platform.system()}/{platform.python_version()})"
_default_locale = _locale.getdefaultlocale()
RB_LANG = f"{_default_locale[0] or 'en'}".replace("-", "_")

# Shared client (lazy-init)
_client: httpx.Client | None = None


def get_client() -> httpx.Client:
    """Return a shared ``httpx.Client`` (thread-safe singleton)."""
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.Client(
            timeout=httpx.Timeout(connect=30.0, read=120.0, write=120.0, pool=30.0),
            follow_redirects=True,
            verify=False,  # match Java hostnameVerifier that accepts all
        )
    return _client


def _build_headers(headers: dict[str, str] | None = None) -> dict[str, str]:
    """Merge default + caller-supplied headers."""
    h = {
        "User-Agent": RB_UA,
        "Accept-Language": RB_LANG,
    }
    if headers:
        h.update(headers)
    return h


# ── GET ─────────────────────────────────────────────────────────────

def get(url: str, headers: dict[str, str] | None = None, charset: str = "utf-8") -> str:
    """HTTP GET returning response body as string."""
    client = get_client()
    t0 = time.monotonic()
    try:
        resp = client.get(url, headers=_build_headers(headers))
        resp.raise_for_status()
        return resp.content.decode(charset or "utf-8")
    finally:
        elapsed = (time.monotonic() - t0) * 1000
        if elapsed > 3000:
            log.warning("Http GET `%s` time %.0fms", url, elapsed)


# ── POST ────────────────────────────────────────────────────────────

def post(
    url: str,
    req_data: Any = None,
    headers: dict[str, str] | None = None,
) -> str:
    """HTTP POST.  *req_data* may be a dict (form), str (text/plain), or JSON-serialisable object."""
    client = get_client()

    if isinstance(req_data, dict) and not headers:
        # Assume form-encoded
        data = req_data
        content_type = None  # httpx handles form encoding
    elif isinstance(req_data, str):
        data = req_data
        content_type = "text/plain"
    else:
        # JSON
        import json as _json
        data = _json.dumps(req_data, ensure_ascii=False, default=str)
        content_type = "application/json"

    hdrs = _build_headers(headers)
    if content_type:
        hdrs["Content-Type"] = content_type

    t0 = time.monotonic()
    try:
        resp = client.post(url, content=data if isinstance(data, str) else None,
                           data=data if isinstance(data, dict) else None,
                           headers=hdrs)
        resp.raise_for_status()
        return resp.text
    finally:
        elapsed = (time.monotonic() - t0) * 1000
        if elapsed > 3000:
            log.warning("Http POST `%s` time %.0fms", url, elapsed)


# ── Binary download ─────────────────────────────────────────────────

def read_binary(url: str, dest: Path | None = None, headers: dict[str, str] | None = None) -> Path | bytes | None:
    """Download a binary file.

    If *dest* is given, writes to that path and returns it on success.
    Otherwise returns the raw bytes.
    """
    client = get_client()
    resp = client.get(url, headers=_build_headers(headers))
    if resp.status_code >= 400:
        log.error("Binary download failed %s : %s", url, resp.status_code)
        return None

    if dest is not None:
        dest = Path(dest)
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(resp.content)
        return dest

    return resp.content


def download_to_temp(url: str) -> Path | None:
    """Download a URL to a temp file and return the path."""
    import tempfile
    suffix = Path(url).suffix or ".bin"
    tmp = Path(tempfile.mktemp(suffix=suffix))
    data = read_binary(url)
    if data is not None:
        tmp.write_bytes(data if isinstance(data, bytes) else b"")
        return tmp
    return None
