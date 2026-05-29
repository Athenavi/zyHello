"""Admin routes — system config, admin verify, admin CLI, user settings APIs."""
from fastapi import APIRouter, Depends, Request, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.deps import get_current_user
from app.models import User
from app.template_deps import templates
from app.services.user_service import (
    send_email_vcode, save_email, save_password,
    get_login_logs, passwd_expired_save,
    cancel_external_user, get_external_user,
)

router = APIRouter()


# ══════════════════════════════════════════════════════════════════════
# Template-rendering routes (page views)
# ══════════════════════════════════════════════════════════════════════


@router.get("/admin/systems")
async def system_cfg(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Render system configuration page."""
    return templates.TemplateResponse(request, "admin/system-cfg.html", {
        "user": current_user,
    })


@router.get("/user/admin-verify")
async def admin_verify(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Render admin verification page."""
    return templates.TemplateResponse(request, "admin/admin-verify.html", {
        "user": current_user,
    })


@router.get("/admin/admin-cli")
async def admin_cli(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Render admin CLI page."""
    return templates.TemplateResponse(request, "admin/admin-cli.html", {
        "user": current_user,
    })


# ══════════════════════════════════════════════════════════════════════
# API endpoints — User Settings (UserSettingsController)
# Migrated from UserSettingsController.java
# ══════════════════════════════════════════════════════════════════════


@router.get("/user/info")
async def api_user_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get current user info.

    Migrated from UserSettingsController.user (GET /user).
    """
    return {
        "error_code": 0,
        "data": {
            "id": str(current_user.user_id),
            "fullName": current_user.full_name,
            "loginName": current_user.login_name,
            "email": current_user.email,
            "deptId": str(current_user.dept_id) if current_user.dept_id else None,
            "isDisabled": current_user.is_disabled,
        },
    }


@router.post("/user/send-email-vcode")
async def api_send_email_vcode(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send email verification code.

    Migrated from UserSettingsController.send-email-vcode.
    """
    body = await request.json()
    email = body.get("email")

    if not email:
        return {"error_code": 400, "error_msg": "Email required"}

    result = send_email_vcode(db, email)
    if result:
        return {"error_code": 400, "error_msg": result}
    return {"error_code": 0, "data": True}


@router.post("/user/save-email")
async def api_save_email(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save new email address.

    Migrated from UserSettingsController.save-email.
    """
    body = await request.json()
    email = body.get("email")
    vcode = body.get("vcode")

    if not email or not vcode:
        return {"error_code": 400, "error_msg": "Email and verification code required"}

    result = save_email(db, current_user, email, vcode)
    if result:
        return {"error_code": 400, "error_msg": result}
    return {"error_code": 0, "data": True}


@router.post("/user/save-passwd")
async def api_save_password(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save new password.

    Migrated from UserSettingsController.save-passwd.
    """
    body = await request.json()
    old_passwd = body.get("oldPasswd")
    new_passwd = body.get("newPasswd")

    if not old_passwd or not new_passwd:
        return {"error_code": 400, "error_msg": "Old and new passwords required"}

    result = save_password(db, current_user, old_passwd, new_passwd)
    if result:
        return {"error_code": 400, "error_msg": result}
    return {"error_code": 0, "data": True}


@router.get("/user/login-logs")
async def api_login_logs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get login logs for current user.

    Migrated from UserSettingsController.login-logs.
    """
    logs = get_login_logs(db, str(current_user.user_id))
    return {"error_code": 0, "data": logs}


@router.post("/passwd-expired-save")
async def api_passwd_expired_save(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save password from expired-password page.

    Migrated from UserSettingsController.passwd-expired-save.
    """
    body = await request.json()
    new_passwd = body.get("newPasswd")

    if not new_passwd:
        return {"error_code": 400, "error_msg": "New password required"}

    result = passwd_expired_save(db, current_user, new_passwd)
    if result:
        return {"error_code": 400, "error_msg": result}
    return {"error_code": 0, "data": True}


@router.post("/cancel-external-user")
async def api_cancel_external_user(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cancel external user binding.

    Migrated from UserSettingsController.cancel-external-user.
    """
    body = await request.json()
    app_id = body.get("appId")

    if not app_id:
        return {"error_code": 400, "error_msg": "App ID required"}

    cancel_external_user(db, current_user, app_id)
    return {"error_code": 0, "data": True}


@router.get("/user/external-user")
async def api_external_user(
    appid: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get external user binding.

    Migrated from UserSettingsController.
    """
    result = get_external_user(db, str(current_user.user_id), appid)
    return {"error_code": 0, "data": result}
