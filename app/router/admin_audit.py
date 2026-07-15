"""Admin audit routes — login logs, recycle bin, revision history, SMS logs."""
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_admin
from app.models import User
from app.template_deps import templates

router = APIRouter()


@router.get("/admin/audit/login-logs")
async def login_logs(
    request: Request,
    current_user: User = Depends(require_admin),
):
    """Render admin login logs page."""
    return templates.TemplateResponse(request, "admin/audit/login-logs.html", {
        "user": current_user,
    })


@router.get("/admin/audit/recycle-bin")
async def recycle_bin(
    request: Request,
    current_user: User = Depends(require_admin),
):
    """Render admin recycle bin page."""
    return templates.TemplateResponse(request, "admin/audit/recycle-bin.html", {
        "user": current_user,
    })


@router.get("/admin/audit/revision-history")
async def revision_history(
    request: Request,
    current_user: User = Depends(require_admin),
):
    """Render admin revision history page."""
    return templates.TemplateResponse(request, "admin/audit/revision-history.html", {
        "user": current_user,
    })


@router.get("/admin/audit/smsend-logs")
async def smsend_logs(
    request: Request,
    current_user: User = Depends(require_admin),
):
    """Render admin SMS send logs page."""
    return templates.TemplateResponse(request, "admin/audit/smsend-logs.html", {
        "user": current_user,
    })
