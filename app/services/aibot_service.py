"""AiBot service — manage AI chat sessions and messages."""
import json
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.models import AibotChat, AibotChatMessage, SystemConfig


def _gen_id() -> str:
    return uuid.uuid4().hex[:20]


def init_chat(db: Session, user_id: str, chat_id: str = None) -> dict:
    """Initialize or retrieve a chat session.

    Returns {"chatid": str, "messages": list}.
    """
    if chat_id:
        chat = db.query(AibotChat).filter(AibotChat.chat_id == chat_id).first()
        if chat:
            messages = db.query(AibotChatMessage).filter(
                AibotChatMessage.chat_id == chat_id
            ).order_by(AibotChatMessage.created_on.asc()).all()

            msg_list = []
            for m in messages:
                msg_list.append({"role": m.role, "content": m.content})

            return {"chatid": chat_id, "messages": msg_list}

    # Return welcome message for new chat
    aibot_name = _get_config(db, "AibotName") or "AI 助手"
    welcome = {"role": "ai", "content": f"欢迎使用 {aibot_name}！有什么问题都可以向我提问哦"}
    return {"chatid": None, "messages": [welcome]}


def create_chat(db: Session, user_id: str) -> str:
    """Create a new chat session."""
    chat = AibotChat(
        chat_id=_gen_id(),
        subject="新对话",
        created_by=user_id,
    )
    db.add(chat)
    db.commit()
    return chat.chat_id


def post_message(db: Session, chat_id: str, user_id: str, content: str) -> dict:
    """Post a user message and get AI response.

    Returns {"role": "ai", "content": "..."}.
    """
    # Ensure chat exists
    chat = db.query(AibotChat).filter(AibotChat.chat_id == chat_id).first()
    if not chat:
        chat_id = create_chat(db, user_id)
        chat = db.query(AibotChat).filter(AibotChat.chat_id == chat_id).first()

    # Save user message
    user_msg = AibotChatMessage(
        chat_id=chat_id,
        role="user",
        content=content,
    )
    db.add(user_msg)

    # Generate AI response (simple echo + placeholder)
    ai_content = _generate_ai_response(db, chat_id, content)

    ai_msg = AibotChatMessage(
        chat_id=chat_id,
        role="ai",
        content=ai_content,
    )
    db.add(ai_msg)

    # Update chat subject if first message
    if chat.subject == "新对话" and len(content) > 0:
        chat.subject = content[:50]
    chat.modified_on = datetime.utcnow()

    db.commit()

    return {"role": "ai", "content": ai_content, "chatid": chat_id}


def post_message_stream(db: Session, chat_id: str, user_id: str, content: str):
    """Post a message and yield streaming AI response chunks.

    Yields {"role": "ai", "content": chunk, "done": bool}.
    """
    # Ensure chat exists
    chat = db.query(AibotChat).filter(AibotChat.chat_id == chat_id).first()
    if not chat:
        chat_id = create_chat(db, user_id)
        chat = db.query(AibotChat).filter(AibotChat.chat_id == chat_id).first()

    # Save user message
    user_msg = AibotChatMessage(chat_id=chat_id, role="user", content=content)
    db.add(user_msg)

    # Stream response
    ai_content = _generate_ai_response(db, chat_id, content)
    words = ai_content.split()

    full_response = ""
    for i, word in enumerate(words):
        chunk = word + " "
        full_response += chunk
        done = (i == len(words) - 1)
        yield {"role": "ai", "content": chunk, "done": done, "chatid": chat_id}

    # Save full AI response
    ai_msg = AibotChatMessage(chat_id=chat_id, role="ai", content=full_response.strip())
    db.add(ai_msg)

    if chat.subject == "新对话":
        chat.subject = content[:50]
    chat.modified_on = datetime.utcnow()
    db.commit()


def delete_chat(db: Session, chat_id: str) -> bool:
    """Delete a chat and all its messages."""
    chat = db.query(AibotChat).filter(AibotChat.chat_id == chat_id).first()
    if not chat:
        return False

    db.query(AibotChatMessage).filter(AibotChatMessage.chat_id == chat_id).delete()
    db.delete(chat)
    db.commit()
    return True


def list_chats(db: Session, user_id: str) -> list[dict]:
    """List all chats for a user."""
    rows = db.query(AibotChat).filter(
        AibotChat.created_by == user_id
    ).order_by(AibotChat.modified_on.desc()).all()

    return [
        {
            "chatid": r.chat_id,
            "subject": r.subject,
            "createdOn": r.created_on.strftime("%Y-%m-%d %H:%M") if r.created_on else "",
        }
        for r in rows
    ]


def rename_chat(db: Session, chat_id: str, user_id: str, subject: str) -> bool:
    """Rename a chat."""
    chat = db.query(AibotChat).filter(
        AibotChat.chat_id == chat_id, AibotChat.created_by == user_id
    ).first()
    if not chat:
        return False

    chat.subject = subject
    chat.modified_on = datetime.utcnow()
    db.commit()
    return True


def _generate_ai_response(db: Session, chat_id: str, user_content: str) -> str:
    """Generate an AI response. This is a placeholder that can be replaced
    with a real LLM integration (OpenAI, Azure, etc.).
    """
    # Check if there's an AI bot API config
    ds_secret = _get_config(db, "AibotDSSecret")
    ds_url = _get_config(db, "AibotDSUrl")

    if ds_secret and ds_url:
        # Would call the configured AI service here
        pass

    # Simple fallback response
    responses = [
        f"收到您的问题：「{user_content}」",
        "作为 AI 助手，我正在处理您的请求。",
        "请注意配置 AI 助手的 API 参数以获得更好的回答。",
    ]
    return "\n".join(responses)


def _get_config(db: Session, item: str) -> Optional[str]:
    """Get system config value."""
    row = db.query(SystemConfig).filter(SystemConfig.item == item).first()
    return row.value if row else None
