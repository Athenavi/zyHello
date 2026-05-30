"""Feeds routes — dynamic/announcement/schedule posts with full CRUD APIs."""
from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import User
from app.template_deps import templates
from app.services import feeds_service

router = APIRouter()


# ---------------------------------------------------------------------------
# API endpoints — feeds listing & details
# NOTE: Specific API routes MUST be defined BEFORE the catch-all /feeds/{type}
# page route, otherwise FastAPI's order-based matching will intercept API
# requests and return HTML templates instead of JSON.
# ---------------------------------------------------------------------------

@router.post("/feeds/feeds-list")
async def api_feeds_list(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List feeds with filtering, pagination, top-pinning."""
    body = await request.json()
    feed_type = body.get("type", 0)
    scope_filter = body.get("scope")
    page_no = body.get("pageNo", 1)
    page_size = body.get("pageSize", 40)
    sort = body.get("sort", "created_desc")

    result = feeds_service.list_feeds(
        db, current_user.user_id, feed_type, scope_filter, page_no, page_size, sort
    )

    # Prepend top-pinned feeds
    top_ids = feeds_service.get_user_top_feeds(current_user.user_id)
    if top_ids and page_no == 1:
        top_feeds = []
        for tid in top_ids:
            detail = feeds_service.get_feed_details(db, tid, current_user.user_id)
            if detail:
                top_feeds.append(detail)
        # Remove top feeds from regular list to avoid duplicates
        regular = [f for f in result["data"] if f["id"] not in top_ids]
        result["data"] = top_feeds + regular

    return {"error_code": 0, "data": result}


@router.get("/feeds/feeds-details")
async def api_feeds_details(
    id: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get single feed details."""
    if not id:
        return {"error_code": 400, "error_msg": "缺少动态ID"}
    detail = feeds_service.get_feed_details(db, id, current_user.user_id)
    if not detail:
        return {"error_code": 400, "error_msg": "动态不存在"}
    return {"error_code": 0, "data": detail}


@router.get("/feeds/comments-list")
async def api_comments_list(
    id: str = None,
    page_no: int = 1,
    page_size: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List comments for a feed."""
    if not id:
        return {"error_code": 400, "error_msg": "缺少动态ID"}
    result = feeds_service.list_comments(db, id, page_no, page_size)
    return {"error_code": 0, "data": result}


@router.get("/feeds/announcement-read-status")
async def api_announcement_read_status(
    id: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get read/unread status for an announcement."""
    if not id:
        return {"error_code": 400, "error_msg": "缺少公告ID"}
    result = feeds_service.get_announcement_read_status(db, id)
    return {"error_code": 0, "data": result}


# ---------------------------------------------------------------------------
# API endpoints — feeds CRUD
# ---------------------------------------------------------------------------

@router.post("/feeds/publish")
async def api_publish(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Publish a new feed or comment."""
    body = await request.json()
    feeds_id = feeds_service.publish_feed(db, current_user.user_id, body)
    return {"error_code": 0, "data": feeds_id}


@router.post("/feeds/comment")
async def api_comment(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a comment to a feed."""
    body = await request.json()
    body["entity"] = "FeedsComment"
    comment_id = feeds_service.publish_feed(db, current_user.user_id, body)
    return {"error_code": 0, "data": comment_id}


@router.post("/feeds/like")
async def api_like(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Toggle like on a feed."""
    body = await request.json()
    source = body.get("source", "")
    if not source:
        return {"error_code": 400, "error_msg": "缺少动态ID"}
    liked = feeds_service.toggle_like(db, source, current_user.user_id)
    return {"error_code": 0, "data": {"liked": liked}}


@router.post("/feeds/delete")
async def api_delete_feed(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a feed (soft-delete)."""
    body = await request.json()
    feeds_id = body.get("id", "")
    if not feeds_id:
        return {"error_code": 400, "error_msg": "缺少动态ID"}
    ok = feeds_service.delete_feed(db, feeds_id)
    if not ok:
        return {"error_code": 400, "error_msg": "动态不存在"}
    return {"error_code": 0, "data": {"deleted": True}}


@router.post("/feeds/finish-schedule")
async def api_finish_schedule(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark a schedule feed as finished."""
    body = await request.json()
    feeds_id = body.get("id", "")
    if not feeds_id:
        return {"error_code": 400, "error_msg": "缺少日程ID"}
    err = feeds_service.finish_schedule(db, feeds_id, current_user.user_id)
    if err:
        return {"error_code": 400, "error_msg": err}
    return {"error_code": 0, "data": {"finished": True}}


@router.post("/feeds/feeds-top")
async def api_feeds_top(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Pin/unpin a feed for the current user."""
    body = await request.json()
    feeds_id = body.get("id", "")
    if not feeds_id:
        return {"error_code": 400, "error_msg": "缺少动态ID"}
    feeds_service.toggle_feed_top(db, feeds_id, current_user.user_id)
    return {"error_code": 0, "data": {"topped": True}}


# ---------------------------------------------------------------------------
# Page route — catch-all MUST be last so specific API routes above match first
# ---------------------------------------------------------------------------

@router.get("/feeds/{type}")
async def feeds_home(
    type: str,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Render feeds page by type."""
    return templates.TemplateResponse(request, "feeds/home.html", {
        "user": current_user,
        "feeds_type": type,
    })
