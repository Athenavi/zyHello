"""Project and task routes — project views, task CRUD, tags, comments."""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas.project import (
    TaskTagSaveRequest,
    TaskTagDeleteRequest,
    TaskCommentSaveRequest,
    TaskCommentDeleteRequest,
    RelatedTaskListRequest,
)
from app.services import project_service
from app.template_deps import templates

router = APIRouter()


# ── Project routes (ProjectController) ──────────────────────────────


@router.get("/project/{projectId}/tasks")
async def page_project(
    projectId: str,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Render project task board page (shell — JS loads data via API)."""
    return templates.TemplateResponse(request, "project/project-tasks.html", {
        "user": current_user,
        "projectId": projectId,
    })


@router.get("/project/{projectId}/details")
async def get_plans(
    projectId: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get project plans/details."""
    project = project_service.get_project(db, projectId, current_user.user_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    plans = project_service.get_plans(db, projectId)
    return {"ok": True, "data": {"project": project, "plans": plans}}


@router.get("/project/search")
async def search_project(
    q: str = Query(""),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Search projects by name or code."""
    data = project_service.search_project(db, q)
    return {"ok": True, "data": data}


# ── Project Task routes (ProjectTaskController) ─────────────────────


@router.get("/project/task/{taskId}")
async def page_task(
    taskId: str,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Render task detail page (shell — JS loads data via API)."""
    return templates.TemplateResponse(request, "project/task-view.html", {
        "user": current_user,
        "taskId": taskId,
    })


@router.get("/project/tasks/list")
async def task_list(
    project_id: str = Query(None),
    plan_key: str = Query(None),
    search: str = Query(None),
    sort: str = Query("seq"),
    page_no: int = Query(1),
    page_size: int = Query(40),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List tasks with filtering and pagination."""
    if not project_id:
        return {"ok": True, "data": {"count": 0, "tasks": []}}
    data = project_service.task_list(
        db, project_id, plan_key=plan_key, search=search,
        sort=sort, page_no=page_no, page_size=page_size,
    )
    return {"ok": True, "data": data}


@router.get("/project/tasks/get")
async def task_get(
    task_id: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single task by ID."""
    task = project_service.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"ok": True, "data": task}


@router.get("/project/tasks/details")
async def task_details(
    task_id: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get task details with comments and related tasks."""
    task = project_service.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    comments = project_service.get_task_comments(db, task_id)
    related = project_service.related_task_list(db, task_id)
    return {
        "ok": True,
        "data": {
            **task,
            "comments": comments,
            "related_tasks": related,
        },
    }


@router.get("/project/plan-list")
async def plan_list(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all projects with their plans (frontend-compatible endpoint)."""
    data = project_service.get_project_and_plans(db, current_user.user_id)
    return {"ok": True, "data": data}


@router.get("/project/alist")
async def get_project_and_plans(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all projects with their plans."""
    data = project_service.get_project_and_plans(db, current_user.user_id)
    return {"ok": True, "data": data}


@router.post("/project/tasks/related-list")
async def related_task_list(
    body: RelatedTaskListRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get tasks related to a given task."""
    data = project_service.related_task_list(db, body.task_id)
    return {"ok": True, "data": data}


# ── Task Tag routes (TaskTagController) ─────────────────────────────


@router.get("/project/task-tags")
async def task_tags(
    project_id: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get tags for a project."""
    data = project_service.get_task_tags(db, project_id)
    return {"ok": True, "data": data}


@router.post("/project/task-tag/save")
async def save_task_tag(
    body: TaskTagSaveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a task tag."""
    tag = project_service.save_task_tag(db, body.project_id, body.tag_name, body.color or "", current_user.user_id)
    return {"ok": True, "data": {"tag_id": tag.tag_id, "tag_name": tag.tag_name}}


@router.post("/project/task-tag/delete")
async def delete_task_tag(
    body: TaskTagDeleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a task tag."""
    success = project_service.delete_task_tag(db, body.tag_id)
    if not success:
        raise HTTPException(status_code=404, detail="Tag not found")
    return {"ok": True}


# ── Task Comment routes (TaskCommentController) ─────────────────────


@router.get("/project/task/{taskId}/comments")
async def task_comments(
    taskId: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get comments for a task."""
    data = project_service.get_task_comments(db, taskId)
    return {"ok": True, "data": data}


@router.post("/project/task/comment/save")
async def save_task_comment(
    body: TaskCommentSaveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Save a comment on a task."""
    comment = project_service.save_task_comment(db, body.task_id, body.content, current_user.user_id)
    return {"ok": True, "data": {"comment_id": comment.comment_id}}


@router.post("/project/task/comment/delete")
async def delete_task_comment(
    body: TaskCommentDeleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a task comment."""
    success = project_service.delete_task_comment(db, body.comment_id, current_user.user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Comment not found or not owned by you")
    return {"ok": True}


# ── Task CRUD routes ──────────────────────────────────────────────


@router.post("/project/tasks/save")
async def save_task(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create or update a task."""
    body = await request.json()
    # 检查 metadata 中是否有 id（更新模式）
    metadata = body.get("metadata", {})
    task_id = metadata.get("id") or body.get("task_id") or body.get("id")
    if task_id:
        body["id"] = task_id
    result = project_service.save_task(db, body, str(current_user.user_id))
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return {"ok": True, "data": result}


@router.post("/project/tasks/delete")
async def delete_task_endpoint(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete (soft) a task."""
    body = await request.json()
    task_id = body.get("task_id") or body.get("id")
    if not task_id:
        raise HTTPException(status_code=400, detail="task_id required")
    success = project_service.delete_task(db, task_id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"ok": True}
