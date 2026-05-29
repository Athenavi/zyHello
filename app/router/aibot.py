"""AiBot routes — chat page + AI conversation APIs."""
import json

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import User
from app.template_deps import templates
from app.services import aibot_service

router = APIRouter()


# ---------------------------------------------------------------------------
# Page route
# ---------------------------------------------------------------------------

@router.get("/aibot/chat")
async def aibot_chat(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Render AiBot chat page."""
    return templates.TemplateResponse(request, "aibot/chat-view.html", {
        "user": current_user,
    })


# ---------------------------------------------------------------------------
# API endpoints — AiBot chat
# ---------------------------------------------------------------------------

@router.get("/aibot/post/chat-init")
async def api_chat_init(
    chatid: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Initialize or retrieve a chat session."""
    result = aibot_service.init_chat(db, current_user.user_id, chatid)
    return {"error_code": 0, "data": result}


@router.post("/aibot/post/chat")
async def api_chat(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Post a user message and get AI response (non-streaming)."""
    body = await request.json()
    chat_id = body.get("chatid", "")
    content = body.get("content", "")
    if not content:
        return {"error_code": 400, "error_msg": "消息内容不能为空"}

    result = aibot_service.post_message(db, chat_id, current_user.user_id, content)
    return {"error_code": 0, "data": result}


@router.post("/aibot/post/chat-stream")
async def api_chat_stream(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Post a message and get streaming AI response (SSE)."""
    body = await request.json()
    chat_id = body.get("chatid", "")
    content = body.get("content", "")
    if not content:
        return JSONResponse({"error_code": 400, "error_msg": "消息内容不能为空"})

    def event_generator():
        for chunk in aibot_service.post_message_stream(db, chat_id, current_user.user_id, content):
            yield f"data: {json.dumps(chunk, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/aibot/post/chat-delete")
async def api_chat_delete(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a chat session."""
    body = await request.json()
    chat_id = body.get("chatid", "")
    if not chat_id:
        return {"error_code": 400, "error_msg": "缺少对话ID"}
    ok = aibot_service.delete_chat(db, chat_id)
    if not ok:
        return {"error_code": 400, "error_msg": "对话不存在"}
    return {"error_code": 0, "data": {"deleted": True}}


@router.get("/aibot/post/chat-list")
async def api_chat_list(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all chat sessions for the current user."""
    data = aibot_service.list_chats(db, current_user.user_id)
    return {"error_code": 0, "data": data}


@router.post("/aibot/post/chat-rename")
async def api_chat_rename(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Rename a chat session."""
    body = await request.json()
    chat_id = body.get("chatid", "")
    subject = body.get("subject", "")
    if not chat_id or not subject:
        return {"error_code": 400, "error_msg": "缺少对话ID或名称"}
    ok = aibot_service.rename_chat(db, chat_id, current_user.user_id, subject)
    if not ok:
        return {"error_code": 400, "error_msg": "对话不存在"}
    return {"error_code": 0, "data": {"renamed": True}}
