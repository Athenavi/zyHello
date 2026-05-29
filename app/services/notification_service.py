"""Notification service — messages, approvals, unread count."""
from datetime import datetime
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import Notification


def get_unread_count(db: Session, user_id: str) -> int:
    """Get unread notification count."""
    return db.query(func.count(Notification.message_id)).filter(
        Notification.to_user == user_id,
        Notification.unread == True,
    ).scalar() or 0


def make_read(db: Session, message_ids: list[str]) -> None:
    """Mark notifications as read."""
    for mid in message_ids:
        db.query(Notification).filter(
            Notification.message_id == int(mid)
        ).update({"unread": False})
    db.commit()


def make_all_read(db: Session, user_id: str) -> int:
    """Mark all notifications as read. Returns count of updated."""
    count = db.query(Notification).filter(
        Notification.to_user == user_id,
        Notification.unread == True,
    ).update({"unread": False})
    db.commit()
    return count


def list_messages(
    db: Session,
    user_id: str,
    page_no: int = 1,
    page_size: int = 40,
    msg_type: int = 0,
) -> list[dict]:
    """List notifications for a user with pagination."""
    query = db.query(Notification).filter(Notification.to_user == user_id)

    if msg_type == 1:
        query = query.filter(Notification.unread == True)
    elif msg_type == 2:
        query = query.filter(Notification.unread == False)
    elif msg_type >= 10:
        query = query.filter(
            Notification.type >= msg_type,
            Notification.type < msg_type + 10,
        )

    offset = (page_no - 1) * page_size
    messages = query.order_by(Notification.created_on.desc()).offset(offset).limit(page_size).all()

    return [
        {
            "message_id": m.message_id,
            "from_user": m.from_user,
            "message": m.message,
            "type": m.type,
            "unread": m.unread,
            "related_record": m.related_record,
            "created_on": m.created_on.isoformat() if m.created_on else None,
        }
        for m in messages
    ]


def list_approvals(
    db: Session,
    user_id: str,
    page_no: int = 1,
    page_size: int = 40,
) -> list[dict]:
    """List approval notifications for a user."""
    offset = (page_no - 1) * page_size
    messages = db.query(Notification).filter(
        Notification.to_user == user_id,
        Notification.type == 20,
        Notification.related_record.isnot(None),
    ).order_by(Notification.created_on.desc()).offset(offset).limit(page_size).all()

    return [
        {
            "message_id": m.message_id,
            "from_user": m.from_user,
            "message": m.message,
            "related_record": m.related_record,
            "created_on": m.created_on.isoformat() if m.created_on else None,
        }
        for m in messages
    ]
