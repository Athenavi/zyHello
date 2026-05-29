"""
HTTP ETag support — Python equivalent of Etag.java.

Provides ETag generation and conditional response handling for
Starlette/FastAPI responses.
"""
from __future__ import annotations

import hashlib
from starlette.requests import Request
from starlette.responses import Response


class EtagHelper:
    """
    Manages HTTP ETag for cache validation.

    Usage:
        etag_helper = EtagHelper(etag_value, response)
        if etag_helper.is_need_write(request):
            # write response body
    """

    def __init__(self, etag_value: str, response: Response):
        self._response_etag = f'W/"0{etag_value}"'
        response.headers["ETag"] = self._response_etag
        self._response = response

    @property
    def is_force_no_cache(self) -> bool:
        cache_control = self._response.headers.get("cache-control", "")
        return "no-store" in cache_control

    def is_match_etag(self, request: Request, write_status: bool = True) -> bool:
        """Check if the request's If-None-Match matches our ETag."""
        request_etag = request.headers.get("if-none-match")
        if request_etag is None:
            return False

        # Normalize: strip W/ prefix for comparison
        req_norm = request_etag.lstrip("W/").strip('"')
        resp_norm = self._response_etag.lstrip("W/").strip('"')

        if request_etag == "*" or request_etag == self._response_etag or req_norm == resp_norm:
            if write_status:
                self._response.status_code = 304
            return True
        return False

    def is_need_write(self, request: Request) -> bool:
        """Determine if the full response body needs to be written."""
        if self.is_force_no_cache:
            return True
        return not self.is_match_etag(request, write_status=True)


def generate_etag(content: str | bytes) -> str:
    """Generate an ETag hash from content."""
    if isinstance(content, str):
        content = content.encode("utf-8")
    return hashlib.md5(content).hexdigest()
