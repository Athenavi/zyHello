"""Admin project routes — project list and editor."""
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_admin
from app.models import User
from app.template_deps import templates

router = APIRouter()


@router.get("/admin/project/projects")
async def project_list(
    request: Request,
    current_user: User = Depends(require_admin),
):
    """Render admin project list page."""
    return templates.TemplateResponse(request, "admin/project/project-list.html", {
        "user": current_user,
    })


@router.get("/admin/project/project/{projectId}")
async def project_editor(
    projectId: str,
    request: Request,
    current_user: User = Depends(require_admin),
):
    """Render admin project editor page."""
    return templates.TemplateResponse(request, "admin/project/project-editor.html", {
        "user": current_user,
        "projectId": projectId,
    })
