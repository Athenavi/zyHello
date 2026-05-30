"""Notification routes — messages, approvals, unread count."""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas.notification import MakeReadRequest
from app.services import notification_service
from app.template_deps import templates

router = APIRouter()


@router.get("/notifications")
async def page_index(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Render notification messages page."""
    return templates.TemplateResponse(request, "notification/messages.html", {
        "user": current_user,
    })


@router.get("/notifications/todo")
async def page_todo(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Render todo page."""
    return templates.TemplateResponse(request, "notification/todo.html", {
        "user": current_user,
    })


@router.get("/notification/list")
async def list_notification(
    page: int = Query(1),
    page_size: int = Query(40),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List notifications (frontend-compatible endpoint)."""
    data = notification_service.list_messages(
        db, current_user.user_id, page_no=page, page_size=page_size,
    )
    return {"ok": True, "data": data}


@router.get("/notification/check-state")
async def check_message(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Check unread notification count."""
    count = notification_service.get_unread_count(db, current_user.user_id)
    return {"ok": True, "unread_count": count}


@router.post("/notification/make-read")
async def toggle_unread(
    body: MakeReadRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark notifications as read."""
    if body.read_all:
        count = notification_service.make_all_read(db, current_user.user_id)
        return {"ok": True, "read_count": count}
    elif body.message_ids:
        str_ids = [str(mid) for mid in body.message_ids]
        notification_service.make_read(db, str_ids)
        return {"ok": True, "read_count": len(str_ids)}
    else:
        raise HTTPException(status_code=400, detail="Provide message_ids or read_all=true")


@router.get("/notification/messages")
async def list_message(
    page_no: int = Query(1),
    page_size: int = Query(40),
    msg_type: int = Query(0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List notifications for the current user."""
    data = notification_service.list_messages(
        db, current_user.user_id, page_no=page_no, page_size=page_size, msg_type=msg_type,
    )
    return {"ok": True, "data": data}


@router.get("/notification/approvals")
async def list_approvals(
    page_no: int = Query(1),
    page_size: int = Query(40),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List approval notifications."""
    data = notification_service.list_approvals(
        db, current_user.user_id, page_no=page_no, page_size=page_size,
    )
    return {"ok": True, "data": data}


# ---------------------------------------------------------------------------
# API endpoint — Todo list
# ---------------------------------------------------------------------------


@router.get("/app/todo/list")
async def list_todos(
    page: int = Query(1),
    page_size: int = Query(20),
    current_user: User = Depends(get_current_user),
):
    """List todo items for the current user.

    Returns an empty paginated result since the Todo entity has not been
    migrated yet.  The frontend notifications page calls this endpoint and
    handles empty results gracefully.
    """
    return {
        "error_code": 0,
        "data": {
            "data": [],
            "total": 0,
            "page": page,
            "pageSize": page_size,
        },
    }
