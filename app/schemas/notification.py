"""Notification request/response schemas."""
from pydantic import BaseModel
from typing import Optional, List


class MakeReadRequest(BaseModel):
    message_ids: Optional[List[int]] = None
    read_all: Optional[bool] = False


class NotificationResponse(BaseModel):
    message_id: int
    from_user: Optional[str] = None
    message: Optional[str] = None
    type: Optional[int] = None
    unread: bool = True
    related_record: Optional[str] = None
    created_on: Optional[str] = None


class UnreadCountResponse(BaseModel):
    unread_count: int
