"""Project and task request/response schemas."""
from pydantic import BaseModel
from typing import Optional, List


class TaskTagSaveRequest(BaseModel):
    project_id: str
    tag_name: str
    color: Optional[str] = None


class TaskTagDeleteRequest(BaseModel):
    tag_id: str


class TaskCommentSaveRequest(BaseModel):
    task_id: str
    content: str


class TaskCommentDeleteRequest(BaseModel):
    comment_id: str


class RelatedTaskListRequest(BaseModel):
    task_id: str


class TaskListQuery(BaseModel):
    project_id: Optional[str] = None
    plan_key: Optional[str] = None
    search: Optional[str] = None
    sort: Optional[str] = "seq"
    page_no: Optional[int] = 1
    page_size: Optional[int] = 40
