"""User settings request/response schemas."""
from pydantic import BaseModel, EmailStr
from typing import Optional


class SendEmailVcodeRequest(BaseModel):
    email: EmailStr


class SaveEmailRequest(BaseModel):
    email: EmailStr
    vcode: str


class SavePasswdRequest(BaseModel):
    old_passwd: str
    new_passwd: str
    confirm_passwd: Optional[str] = None


class PasswdExpiredSaveRequest(BaseModel):
    new_passwd: str


class CancelExternalUserRequest(BaseModel):
    app_id: str


class TempAuthRequest(BaseModel):
    user_id: str


class UserInfoResponse(BaseModel):
    user_id: str
    login_name: str
    email: Optional[str] = None
    full_name: str
    avatar_url: Optional[str] = None
    workphone: Optional[str] = None
    dept_id: Optional[str] = None
    dept_name: Optional[str] = None
    is_active: bool = True
    is_disabled: bool = False


class CheckUserStatusRequest(BaseModel):
    user_id: str
