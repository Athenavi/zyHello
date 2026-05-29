"""User settings routes — mirrors UserSettingsController and UCenterController."""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas.user import (
    SendEmailVcodeRequest,
    SaveEmailRequest,
    SavePasswdRequest,
    PasswdExpiredSaveRequest,
    CancelExternalUserRequest,
    TempAuthRequest,
)
from app.services import user_service
from app.template_deps import templates

router = APIRouter()


# ── User Settings (UserSettingsController) ──────────────────────────


@router.get("/settings/user")
async def page_user(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Render current user's settings page."""
    return templates.TemplateResponse(request, "settings/user-settings.html", {
        "user": current_user,
    })


@router.post("/settings/user/send-email-vcode")
async def send_email_vcode(
    body: SendEmailVcodeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Send verification code to a new email address."""
    error = user_service.send_email_vcode(db, body.email)
    if error:
        raise HTTPException(status_code=400, detail=error)
    return {"ok": True, "msg": "Verification code sent"}


@router.post("/settings/user/save-email")
async def save_email(
    body: SaveEmailRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update current user's email after verification."""
    error = user_service.save_email(db, current_user, body.email, body.vcode)
    if error:
        raise HTTPException(status_code=400, detail=error)
    return {"ok": True, "email": current_user.email}


@router.post("/settings/user/save-passwd")
async def save_passwd(
    body: SavePasswdRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Change password."""
    error = user_service.save_password(db, current_user, body.old_passwd, body.new_passwd)
    if error:
        raise HTTPException(status_code=400, detail=error)
    return {"ok": True, "msg": "Password changed"}


@router.get("/settings/user/login-logs")
async def login_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get current user's login log history."""
    logs = user_service.get_login_logs(db, current_user.user_id)
    return {"data": logs}


@router.get("/settings/passwd-expired")
async def page_passwd_expired(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Render password-expired page."""
    return templates.TemplateResponse(request, "settings/passwd-expired.html", {
        "user": current_user,
    })


@router.post("/settings/passwd-expired-save")
async def passwd_expired_save(
    body: PasswdExpiredSaveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Save new password when old one expired."""
    error = user_service.passwd_expired_save(db, current_user, body.new_passwd)
    if error:
        raise HTTPException(status_code=400, detail=error)
    return {"ok": True, "msg": "Password updated"}


@router.post("/settings/cancel-external-user")
async def cancel_external_user(
    body: CancelExternalUserRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Unbind an external user account."""
    user_service.cancel_external_user(db, current_user, body.app_id)
    return {"ok": True}


@router.post("/settings/user/temp-auth")
async def temp_auth(
    body: TempAuthRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate a temporary auth token for another user (admin feature)."""
    from app.services.auth_service import create_access_token

    target = db.query(User).filter(User.user_id == body.user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Target user not found")
    token = create_access_token(target.user_id)
    return {"access_token": token, "user_id": target.user_id}


# ── UCenter (UCenterController) ─────────────────────────────────────


@router.post("/settings/ucenter/bind")
async def bind_cloud_account(
    current_user: User = Depends(get_current_user),
):
    """Bind cloud account — placeholder for UCenter integration."""
    return {"ok": True, "msg": "UCenter bind not yet implemented"}


@router.get("/settings/ucenter/bind-query")
async def bind_query(
    current_user: User = Depends(get_current_user),
):
    """Query UCenter binding status."""
    return {"bound": False}
