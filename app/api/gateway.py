"""
OpenAPI gateway — request routing, signature verification, rate limiting.

Migrated from Java ApiGateway.java.
"""

from __future__ import annotations

import hashlib
import hmac
import logging
import time
import uuid
from typing import Any

from fastapi import APIRouter, Request, Response
from fastapi.responses import JSONResponse

from app.api.base import BaseApi
from app.api.context import ApiContext
from app.api.controller import Controller
from app.api.exceptions import ApiInvokeException
from app.api.system_time import SystemTime
from app.utils.rate_limiter import RateLimiter

log = logging.getLogger(__name__)

router = APIRouter(prefix="/gw/api", tags=["openapi"])

# ---------------------------------------------------------------------------
# Rate limiter: 600 requests per 10s, 3000 per 60s (per IP)
# ---------------------------------------------------------------------------
_rate_limiter = RateLimiter(seconds=[10, 60], limits=[600, 3000])

# ---------------------------------------------------------------------------
# API registry — maps api_name → handler class
# ---------------------------------------------------------------------------
_API_CLASSES: dict[str, type[BaseApi]] = {}


def _register_api(api_cls: type[BaseApi]) -> None:
    """Register an API handler class."""
    name = api_cls().get_api_name()
    if name in _API_CLASSES:
        raise RuntimeError(f"API `{name}` already registered")
    _API_CLASSES[name] = api_cls


# Auto-register built-in APIs
_register_api(SystemTime)


def register_api(api_cls: type[BaseApi]) -> None:
    """Public registration hook for additional API classes."""
    _register_api(api_cls)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_param(params: dict[str, str], name: str) -> str:
    v = params.get(name)
    if not v or not v.strip():
        raise ApiInvokeException(
            f"Parameter [{name}] cannot be null",
            error_code=ApiInvokeException.ERR_BADPARAMS,
        )
    return v


def _verify_signature(sorted_params: dict[str, str], app_secret: str, app_id: str) -> None:
    """Verify HMAC or plain-text signature."""
    timestamp = sorted_params.get("timestamp")
    sign_type = sorted_params.get("sign_type")
    sign = sorted_params.pop("sign", None)

    # Plain-text mode (when no timestamp/sign_type)
    if timestamp is None and sign_type is None:
        if sign != app_secret:
            raise ApiInvokeException(
                f"Invalid [sign] : {sign}",
                error_code=ApiInvokeException.ERR_BADAUTH,
            )
        return

    # Encrypted mode
    system_time = int(time.time())
    if abs(system_time - int(timestamp or "0")) > 15:
        raise ApiInvokeException(
            f"Invalid [timestamp] : {timestamp}",
            error_code=ApiInvokeException.ERR_BADAUTH,
        )

    # Build sign string: key=value&... + appId.appSecret
    parts = [f"{k}={v}" for k, v in sorted_params.items() if k != "sign"]
    sign_str = "&".join(parts) + f"{app_id}.{app_secret}"

    if sign_type == "MD5":
        expected = hashlib.md5(sign_str.encode()).hexdigest()
    elif sign_type == "SHA1":
        expected = hashlib.sha1(sign_str.encode()).hexdigest()
    else:
        raise ApiInvokeException(
            f"Invalid [sign_type] : {sign_type}",
            error_code=ApiInvokeException.ERR_BADAUTH,
        )

    if sign != expected:
        raise ApiInvokeException(
            f"Invalid [sign] : {sign}",
            error_code=ApiInvokeException.ERR_BADAUTH,
        )


# ---------------------------------------------------------------------------
# In-memory API app config (would normally come from DB)
# ---------------------------------------------------------------------------
_api_apps: dict[str, dict[str, Any]] = {}


def register_api_app(app_id: str, app_secret: str, bind_user: str | None = None, bind_ips: str | None = None) -> None:
    """Register an API application with its credentials."""
    _api_apps[app_id] = {
        "appSecret": app_secret,
        "bindUser": bind_user,
        "bindIps": bind_ips,
    }


def _verify_context(request: Request, params: dict[str, str], app_id: str) -> ApiContext:
    """Verify request signature and build context."""
    api_config = _api_apps.get(app_id)
    if not api_config:
        raise ApiInvokeException(
            f"Invalid [appid] : {app_id}",
            error_code=ApiInvokeException.ERR_BADAUTH,
        )

    # IP whitelist check
    bind_ips = api_config.get("bindIps")
    if bind_ips:
        client_ip = request.client.host if request.client else "unknown"
        ip_list = [ip.strip() for ip in bind_ips.split(",")]
        if client_ip not in ip_list:
            raise ApiInvokeException(
                f"Client ip not in whitelist : {client_ip}",
                error_code=ApiInvokeException.ERR_BADAUTH,
            )

    sorted_params = dict(sorted(params.items()))
    app_secret = api_config["appSecret"]
    _verify_signature(sorted_params, app_secret, app_id)

    bind_user = api_config.get("bindUser") or "system"
    return ApiContext(
        parameter_map=sorted_params,
        app_id=app_id,
        bind_user=bind_user,
    )


# ---------------------------------------------------------------------------
# Gateway route
# ---------------------------------------------------------------------------

@router.api_route("/{api_name:path}", methods=["GET", "POST"])
async def gateway(request: Request, api_name: str) -> Response:
    """
    Catch-all OpenAPI gateway endpoint.

    Accepts GET query params or POST JSON body.  Verifies appid + sign,
    then dispatches to the registered ``BaseApi`` handler.
    """
    remote_ip = request.client.host if request.client else "unknown"
    request_id = uuid.uuid4().hex[:12]
    request_time = time.time()

    # Rate limit by IP
    if not _rate_limiter.is_allowed():
        error = Controller.format_failure(
            "Request frequency exceeded",
            ApiInvokeException.ERR_FREQUENCY,
        )
        log.error("Rate limited ReqId:%s IP:%s", request_id, remote_ip)
        return JSONResponse(content=error, status_code=429)

    try:
        # Resolve API handler
        api_cls = _API_CLASSES.get(api_name)
        if not api_cls:
            raise ApiInvokeException(
                f"Unknown API : {api_name}",
                error_code=ApiInvokeException.ERR_BADAPI,
            )

        # Build params from query + form + JSON body
        params: dict[str, str] = {}
        for k, v in request.query_params.items():
            params[k] = v

        post_data = None
        if request.method == "POST":
            try:
                post_data = await request.json()
                if isinstance(post_data, dict):
                    for k, v in post_data.items():
                        if isinstance(v, str):
                            params.setdefault(k, v)
            except Exception:
                pass

        app_id = params.get("appid", "")
        context = _verify_context(request, params, app_id)
        context.post_data = post_data

        api = api_cls()
        result = api.execute(context)
        elapsed = time.time() - request_time

        log.info(
            "API %s ReqId:%s IP:%s elapsed:%.3fs",
            api_name, request_id, remote_ip, elapsed,
        )
        return JSONResponse(content=result)

    except ApiInvokeException as exc:
        error = Controller.format_failure(exc.get_error_msg(), exc.get_error_code())
        log.error("API %s error: %s", api_name, exc.get_error_msg())
        return JSONResponse(content=error, status_code=exc.get_error_code())

    except Exception as exc:
        error = Controller.format_failure(str(exc), Controller.CODE_SERV_ERROR)
        log.exception("API %s unexpected error", api_name)
        return JSONResponse(content=error, status_code=500)
