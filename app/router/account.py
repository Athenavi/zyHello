"""Account routes — user info, avatar."""
import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, get_optional_user
from app.models import User
from app.schemas.user import CheckUserStatusRequest

router = APIRouter()

AVATAR_DIR = "app/static/avatars"


# ── User Info (UserInfoController) ──────────────────────────────────


@router.get("/account/user-info")
async def user_info(
    current_user: User = Depends(get_current_user),
):
    """Return current authenticated user info."""
    return {
        "user_id": current_user.user_id,
        "login_name": current_user.login_name,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "avatar_url": current_user.avatar_url,
        "workphone": current_user.workphone,
        "dept_id": current_user.dept_id,
        "is_active": current_user.is_active,
    }


@router.post("/account/check-user-status")
async def check_user_status(
    body: CheckUserStatusRequest,
    db: Session = Depends(get_db),
):
    """Check if a user exists and is active."""
    user = db.query(User).filter(User.user_id == body.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "user_id": user.user_id,
        "is_active": user.is_active,
        "is_disabled": user.is_disabled,
        "full_name": user.full_name,
    }


# ── User Avatar (UserAvatar) ────────────────────────────────────────


@router.get("/account/user-avatar")
async def user_avatar_default(
    current_user: User = Depends(get_current_user),
):
    """Get current user's avatar URL."""
    avatar_path = None
    if current_user.avatar_url:
        full = os.path.join(AVATAR_DIR, current_user.avatar_url)
        if os.path.isfile(full):
            avatar_path = current_user.avatar_url

    if not avatar_path:
        return {"avatar_url": None, "msg": "No avatar set"}

    return {"avatar_url": f"/static/avatars/{avatar_path}"}


@router.get("/account/user-avatar/{user}")
async def user_avatar(
    user: str,
    db: Session = Depends(get_db),
):
    """Get a specific user's avatar."""
    target = db.query(User).filter(User.user_id == user).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    if target.avatar_url:
        full = os.path.join(AVATAR_DIR, target.avatar_url)
        if os.path.isfile(full):
            return FileResponse(full)

    # Return default avatar or 404
    default = os.path.join(AVATAR_DIR, "default.png")
    if os.path.isfile(default):
        return FileResponse(default)
    raise HTTPException(status_code=404, detail="Avatar not found")


@router.post("/account/user-avatar-update")
async def user_avatar_update(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload and update user avatar."""
    os.makedirs(AVATAR_DIR, exist_ok=True)

    ext = os.path.splitext(file.filename)[1] if file.filename else ".png"
    filename = f"{current_user.user_id}_{uuid.uuid4().hex[:8]}{ext}"
    filepath = os.path.join(AVATAR_DIR, filename)

    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    # Remove old avatar file if exists
    if current_user.avatar_url:
        old_path = os.path.join(AVATAR_DIR, current_user.avatar_url)
        if os.path.isfile(old_path):
            os.remove(old_path)

    current_user.avatar_url = filename
    db.commit()

    return {"ok": True, "avatar_url": f"/static/avatars/{filename}"}
