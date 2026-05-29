"""Auth-related request/response schemas."""
from pydantic import BaseModel, EmailStr
from typing import Optional


class LoginRequest(BaseModel):
    username: str
    password: str
    vcode: Optional[str] = None
    remember_me: Optional[bool] = False


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str


class SignupEmailVcodeRequest(BaseModel):
    email: EmailStr


class SignupConfirmRequest(BaseModel):
    email: EmailStr
    vcode: str
    login_name: Optional[str] = None
    full_name: str
    passwd: Optional[str] = None


class CheckoutNameRequest(BaseModel):
    name: str


class ForgotPasswdRequest(BaseModel):
    email: EmailStr


class UserForgotPasswdRequest(BaseModel):
    email: EmailStr
    vcode: str


class UserConfirmPasswdRequest(BaseModel):
    email: EmailStr
    vcode: str
    new_passwd: str


class CaptchaRequest(BaseModel):
    vcode: str
