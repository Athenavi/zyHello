"""Common/shared routes — chart, mermaid, file preview, url-safe, shared dashboards, tasks, language."""
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.deps import get_current_user
from app.models import User
from app.template_deps import templates
from app.core import (
    get_task, get_task_state, cancel_task, list_tasks,
)

router = APIRouter()


# ══════════════════════════════════════════════════════════════════════
# Template-rendering routes (page views)
# ══════════════════════════════════════════════════════════════════════


@router.get("/commons/url-safe")
async def url_safe(request: Request):
    """Render URL safe page."""
    return templates.TemplateResponse(request, "common/url-safe.html", {})


@router.get("/commons/mermaid")
async def mermaid_chart(request: Request):
    """Render mermaid chart viewer."""
    return templates.TemplateResponse(request, "common/mermaid-chart.html", {})


@router.get("/commons/chart")
async def chart(request: Request):
    """Render chart viewer page."""
    return templates.TemplateResponse(request, "common/chart.html", {})


@router.get("/commons/file-preview")
async def file_preview(request: Request):
    """Render file preview (Office Online) page."""
    return templates.TemplateResponse(request, "common/oo-preview.html", {})


@router.get("/commons/file-editor")
async def file_editor(request: Request):
    """Render markdown editor page."""
    return templates.TemplateResponse(request, "common/md-preview.html", {})


@router.get("/commons/search-icon")
async def search_icon(request: Request):
    """Render search icon picker."""
    return templates.TemplateResponse(request, "common/search-icon.html", {})


@router.get("/commons/shared-dash")
async def shared_dash(request: Request):
    """Render shared dashboard page."""
    return templates.TemplateResponse(request, "common/shared-dash.html", {})


@router.get("/commons/shared-file")
async def shared_file(request: Request):
    """Render shared file page."""
    return templates.TemplateResponse(request, "common/shared-file.html", {})


@router.get("/commons/shared-folder")
async def shared_folder(request: Request):
    """Render shared folder page."""
    return templates.TemplateResponse(request, "common/shared-folder.html", {})


@router.get("/commons/frame")
async def frame(request: Request):
    """Render frame page."""
    return templates.TemplateResponse(request, "common/frame.html", {})


# ══════════════════════════════════════════════════════════════════════
# API endpoints — Heavy Tasks (HeavyTaskController)
# Migrated from HeavyTaskController.java
# ══════════════════════════════════════════════════════════════════════


@router.get("/commons/task/state")
async def api_task_state(
    taskid: str = Query(...),
    current_user: User = Depends(get_current_user),
):
    """Get task state/progress.

    Migrated from HeavyTaskController.state.
    """
    state = get_task_state(taskid)
    if not state:
        return {"error_code": 404, "error_msg": "Task not found"}
    return {"error_code": 0, "data": state}


@router.post("/commons/task/cancel")
async def api_task_cancel(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Cancel a running task.

    Migrated from HeavyTaskController.cancel.
    """
    body = await request.json()
    taskid = body.get("taskid")

    if not taskid:
        return {"error_code": 400, "error_msg": "Task ID required"}

    success = cancel_task(taskid)
    if not success:
        return {"error_code": 400, "error_msg": "Cannot cancel task"}
    return {"error_code": 0, "data": True}


@router.get("/commons/task/list")
async def api_task_list(
    current_user: User = Depends(get_current_user),
):
    """List all running tasks.

    Migrated from HeavyTaskController.
    """
    tasks = list_tasks()
    return {"error_code": 0, "data": tasks}


# ══════════════════════════════════════════════════════════════════════
# API endpoints — Language (LanguageController)
# Migrated from LanguageController.java
# ══════════════════════════════════════════════════════════════════════


@router.get("/commons/use-bundle")
async def api_use_bundle(
    lang: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
):
    """Get language bundle for the current locale.

    Migrated from LanguageController.use-bundle.
    """
    import json
    from pathlib import Path

    # Determine locale
    locale = lang or "zh_CN"
    bundle_path = Path(f"src/main/resources/i18n/lang.{locale}.json")

    if not bundle_path.exists():
        # Fallback to default
        bundle_path = Path("src/main/resources/i18n/lang.zh_CN.json")

    if bundle_path.exists():
        with open(bundle_path, "r", encoding="utf-8") as f:
            bundle = json.load(f)
    else:
        bundle = {}

    return {"error_code": 0, "data": bundle}
