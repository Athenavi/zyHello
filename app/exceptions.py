from fastapi import HTTPException
from pydantic import BaseModel

class BusinessException(HTTPException):
    """Custom business exception with a standardized error response."""
    def __init__(self, status_code: int = 400, detail: str = "Business error", code: str | None = None):
        super().__init__(status_code=status_code, detail=detail)
        self.code = code

class ErrorResponse(BaseModel):
    detail: str
    code: str | None = None
