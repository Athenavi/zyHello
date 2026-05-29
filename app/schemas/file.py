"""File management request/response schemas."""
from pydantic import BaseModel
from typing import Optional, List


class PostFilesRequest(BaseModel):
    filenames: List[str]
    folder_id: Optional[str] = None


class DeleteFilesRequest(BaseModel):
    file_ids: List[str]


class MoveFilesRequest(BaseModel):
    file_ids: List[str]
    folder_id: Optional[str] = None


class CheckFilesRequest(BaseModel):
    filenames: List[str]
    folder_id: Optional[str] = None


class CheckReadableRequest(BaseModel):
    file_id: str


class FileEditRequest(BaseModel):
    file_id: str
    file_name: Optional[str] = None
    folder_id: Optional[str] = None
