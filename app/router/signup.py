"""Signup, login, and password-recovery routes."""
import random
import string
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas.auth import (
    LoginRequest,
    SignupEmailVcodeRequest,
    SignupConfirmRequest,
    CheckoutNameRequest,
    ForgotPasswdRequest,
    UserForgotPasswdRequest,
    UserConfirmPasswdRequest,
)
from app.services import auth_service, sso_service
from app.template_deps import templates

router = APIRouter()

# In-memory login retry counter (replace with Redis in production)
_login_retry: dict[str, tuple[int, datetime]] = {}
MAX_LOGIN_RETRIES = 5
RETRY_LOCKOUT_MINUTES = 30


# ── SignUp routes (SignUpController) ────────────────────────────────


@router.get("/user/signup")
async def page_signup(request: Request):
    """Render public signup page."""
    return templates.TemplateResponse(request, "signup/signup.html", {
        "signup_enabled": True,
    })


@router.post("/user/signup-email-vcode")
async def signup_email_vcode(
    body: SignupEmailVcodeRequest,
    db: Session = Depends(get_db),
):
    """Send verification code for public signup."""
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    code = auth_service.store_vcode(body.email, purpose=1)
    # In production: send email via SMTP
    return {"ok": True, "msg": "Verification code sent", "vcode": code}


@router.post("/user/signup-confirm")
async def signup_confirm(
    body: SignupConfirmRequest,
    db: Session = Depends(get_db),
):
    """Confirm public registration."""
    if not auth_service.verify_vcode(body.email, body.vcode, purpose=1):
        raise HTTPException(status_code=400, detail="Invalid verification code")

    login_name = body.login_name
    if not login_name:
        # Auto-generate login name from email prefix
        login_name = body.email.split("@")[0]
        # Ensure uniqueness
        base = login_name
        suffix = 1
        while db.query(User).filter(User.login_name == login_name).first():
            login_name = f"{base}{suffix}"
            suffix += 1

    error = auth_service.check_user_exists(db, login_name, body.email)
    if error:
        raise HTTPException(status_code=400, detail=error)

    user = auth_service.register_user(db, body.email, login_name, body.full_name, body.passwd or "")
    token = auth_service.create_access_token(user.user_id)
    return {"ok": True, "access_token": token, "user_id": user.user_id}


@router.post("/user/checkout-name")
async def checkout_name(
    body: CheckoutNameRequest,
    db: Session = Depends(get_db),
):
    """Check if a login name is available."""
    exists = db.query(User).filter(User.login_name == body.name).first()
    return {"ok": True, "available": exists is None}


@router.get("/user/forgot-passwd")
async def forgot_passwd(request: Request):
    """Render forgot-password page."""
    return templates.TemplateResponse(request, "signup/forgot-passwd.html", {})


@router.post("/user/user-forgot-passwd")
async def user_forgot_passwd(
    body: UserForgotPasswdRequest,
    db: Session = Depends(get_db),
):
    """Send verification code for password reset."""
    user = db.query(User).filter(User.email == body.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Email not found")
    code = auth_service.store_vcode(body.email, purpose=2)
    return {"ok": True, "msg": "Verification code sent"}


@router.post("/user/user-confirm-passwd")
async def user_confirm_passwd(
    body: UserConfirmPasswdRequest,
    db: Session = Depends(get_db),
):
    """Reset password with verification code."""
    if not auth_service.verify_vcode(body.email, body.vcode, purpose=2):
        raise HTTPException(status_code=400, detail="Invalid verification code")
    user = db.query(User).filter(User.email == body.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    auth_service.reset_password(db, user, body.new_passwd)
    return {"ok": True, "msg": "Password reset successfully"}


# ── Login routes (LoginController) ──────────────────────────────────


@router.get("/user/login")
async def check_login(request: Request):
    """Render login page (public)."""
    return templates.TemplateResponse(request, "signup/login.html", {})


@router.post("/user/user-login")
async def user_login(
    body: LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """Authenticate user and return JWT token."""
    username = body.username.strip()

    # Check retry lockout
    entry = _login_retry.get(username)
    if entry:
        count, locked_until = entry
        if count >= MAX_LOGIN_RETRIES and datetime.utcnow() < locked_until:
            raise HTTPException(
                status_code=429,
                detail=f"Too many attempts. Try again after {RETRY_LOCKOUT_MINUTES} minutes.",
            )

    user = auth_service.authenticate_user(db, username, body.password)
    if not user:
        # Increment retry counter
        current = _login_retry.get(username, (0, datetime.utcnow()))
        new_count = current[0] + 1
        _login_retry[username] = (
            new_count,
            datetime.utcnow() + __import__("datetime").timedelta(minutes=RETRY_LOCKOUT_MINUTES),
        )
        raise HTTPException(status_code=401, detail="Invalid username or password")

    # Reset retry counter on success
    _login_retry.pop(username, None)

    ip_addr = request.client.host if request.client else ""
    user_agent = request.headers.get("user-agent", "")
    result = auth_service.login_user(db, user, ip_addr, user_agent)

    response = JSONResponse(content=result)
    # Set cookie for remember-me
    if body.remember_me:
        response.set_cookie(
            key="auth_token",
            value=result["access_token"],
            max_age=86400 * 30,  # 30 days
            httponly=True,
        )
    return response


@router.get("/user/logout")
async def logout():
    """Logout — clear cookies."""
    response = JSONResponse(content={"ok": True, "msg": "Logged out"})
    response.delete_cookie("auth_token")
    return response


@router.get("/user/login/temp-auth")
async def login_temp_auth(
    current_user: User = Depends(get_current_user),
):
    """Get temporary auth info for current session."""
    return {
        "user_id": current_user.user_id,
        "full_name": current_user.full_name,
    }


@router.get("/user/live-wallpaper")
async def live_wallpaper():
    """Return live-wallpaper config (static data)."""
    return {
        "enabled": False,
        "url": "",
    }


@router.get("/user/captcha")
async def captcha():
    """Generate and return a captcha challenge."""
    # Simple numeric captcha; in production use image-based captcha
    code = "".join(random.choices(string.digits, k=4))
    return {"ok": True, "captcha_id": code, "msg": "Enter the captcha"}


@router.get("/user/sso-providers")
async def sso_providers(
    db: Session = Depends(get_db),
):
    """Return available SSO login providers.

    Returns a list of enabled SSO provider keys (e.g. ["dingtalk", "wxwork"]).
    """
    providers = sso_service.get_enabled_providers(db)
    return {"data": providers}


@router.get("/user/sso")
async def sso_redirect(
    protocol: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """Redirect user to the SSO provider's OAuth authorization page."""
    config = sso_service.get_provider_config(db, protocol)
    provider = sso_service.get_provider(protocol, config)
    if not provider:
        raise HTTPException(status_code=400, detail=f"不支持的 SSO 协议: {protocol}")

    state = __import__("secrets").token_urlsafe(16)
    # Note: In production, store state in cache/Redis for CSRF validation

    # Build redirect URI (this callback endpoint)
    base_url = str(request.base_url).rstrip("/")
    redirect_uri = f"{base_url}/user/sso/callback"

    authorize_url = provider.get_authorize_url(redirect_uri, state)
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=authorize_url)


@router.get("/user/sso/callback")
async def sso_callback(
    request: Request,
    db: Session = Depends(get_db),
):
    """SSO OAuth callback — handle provider redirect with authorization code.

    Query params:
      - code: authorization code from provider
      - state: CSRF state token
      - protocol: provider key (dingtalk|wxwork|feishu), extracted from state
    """
    code = request.query_params.get("code", "")
    protocol = request.query_params.get("protocol", "")

    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code")
    if not protocol:
        raise HTTPException(status_code=400, detail="Missing protocol parameter")

    base_url = str(request.base_url).rstrip("/")
    redirect_uri = f"{base_url}/user/sso/callback"

    try:
        result = await sso_service.sso_login(db, protocol, code, redirect_uri)
        # Redirect to frontend with token
        frontend_url = "http://localhost:3000"  # In production, use config
        redirect_url = f"{frontend_url}/login/sso?token={result['access_token']}"
        from fastapi.responses import RedirectResponse
        return RedirectResponse(url=redirect_url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"SSO 登录失败: {str(e)}")


@router.get("/user/login-announcement")
async def login_announcement():
    """Return login page announcement message, if any.

    The announcement is displayed as a banner on the login page.
    Returns empty msg when no announcement is active.
    """
    # TODO: Read from configuration_service or maintenance mode
    return {"msg": ""}
