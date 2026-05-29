"""IP geolocation utilities — replaces LocationUtils.java."""

from __future__ import annotations

import logging
import re
from typing import Any

from app.utils import http_client

log = logging.getLogger(__name__)

# Private / reserved IP pattern
_PRIVATE_IP_RE = re.compile(
    r"(localhost)|"
    r"(^127\.)|(^10\.)|(^172\.1[6-9]\.)|(^172\.2[0-9]\.)|(^172\.3[0-1]\.)|(^192\.168\.)"
)

# Simple in-memory cache  (ip -> result_dict)
_location_cache: dict[str, dict[str, Any]] = {}


def get_location(ip: str, use_cache: bool = True) -> dict[str, Any]:
    """Resolve *ip* to a location dict::

        {"ip": "…", "country": "CN", "region": "…", "city": "…"}
    """
    ip = ip.split(",")[0].strip()

    if is_private(ip):
        return {"ip": ip, "country": "R"}

    if use_cache and ip in _location_cache:
        return _location_cache[ip]

    result: dict[str, Any] = {"ip": ip, "country": "N"}

    # Try ip-api.com first
    try:
        url = f"http://ip-api.com/json/{ip}?lang=zh-CN"
        data = http_client.get(url)
        import json as _json
        fetched = _json.loads(data)
        if fetched.get("countryCode"):
            result["country"] = fetched["countryCode"]
            result["region"] = fetched.get("regionName", "")
            result["city"] = fetched.get("city", "")
        elif "private" in (msg := fetched.get("message", "")) or "reserved" in msg:
            result["country"] = "R"
        _location_cache[ip] = result
        return result
    except Exception as exc:
        log.debug("ip-api.com failed for %s : %s", ip, exc)

    # Fallback: ipapi.co
    try:
        url = f"https://ipapi.co/{ip}/json/"
        data = http_client.get(url)
        import json as _json
        fetched = _json.loads(data)
        if fetched.get("country"):
            result["country"] = fetched["country"]
            result["region"] = fetched.get("region", "")
            result["city"] = fetched.get("city", "")
        elif fetched.get("reserved"):
            result["country"] = "R"
    except Exception as exc:
        log.debug("ipapi.co failed for %s : %s", ip, exc)

    _location_cache[ip] = result
    return result


def is_private(ip: str) -> bool:
    """Return ``True`` if *ip* is a private / loopback address."""
    if not ip:
        return False
    ip = ip.split(",")[0].strip()
    return bool(_PRIVATE_IP_RE.search(ip))
