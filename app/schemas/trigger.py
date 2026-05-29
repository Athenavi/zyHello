"""Trigger request/response schemas."""
from pydantic import BaseModel
from typing import Optional


class TriggerListQuery(BaseModel):
    entity: Optional[str] = None
    search: Optional[str] = None


class AvailableEntitiesQuery(BaseModel):
    action_type: str
