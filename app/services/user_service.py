"""User settings service — email, password, login logs, external bindings."""
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.models import User, LoginLog, ExternalUser
from app.services.auth_service import store_vcode, verify_vcode, _hash_password


def send_email_vcode(db: Session, email: str) -> Optional[str]:
    """Send email verification code. Returns error message or None on success."""
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        return "Email is already taken"
    code = store_vcode(email, purpose=0)
    # In production: send email via SMTP/SMSender
    return None


def save_email(db: Session, user: User, email: str, vcode: str) -> Optional[str]:
    """Save new email after verification. Returns error or None."""
    if not verify_vcode(email, vcode, purpose=0):
        return "Invalid verification code"
    existing = db.query(User).filter(User.email == email, User.user_id != user.user_id).first()
    if existing:
        return "Email is already taken"
    user.email = email
    db.commit()
    return None


def save_password(db: Session, user: User, old_passwd: str, new_passwd: str) -> Optional[str]:
    """Change user password. Returns error or None."""
    if _hash_password(old_passwd) != user.password:
        return "Original password is incorrect"
    user.password = _hash_password(new_passwd)
    db.commit()
    return None


def get_login_logs(db: Session, user_id: str, limit: int = 100) -> list[dict]:
    """Get login log history for a user."""
    logs = db.query(LoginLog).filter(
        LoginLog.user_id == user_id
    ).order_by(LoginLog.login_time.desc()).limit(limit).all()
    return [
        {
            "login_time": log.login_time.isoformat() if log.login_time else None,
            "ip_addr": log.ip_addr,
            "user_agent": log.user_agent,
        }
        for log in logs
    ]


def passwd_expired_save(db: Session, user: User, new_passwd: str) -> Optional[str]:
    """Save new password when expired. Returns error or None."""
    if _hash_password(new_passwd) == user.password:
        return "New password cannot be the same as the old one"
    user.password = _hash_password(new_passwd)
    db.commit()
    return None


def cancel_external_user(db: Session, user: User, app_id: str) -> None:
    """Unbind external user account."""
    db.query(ExternalUser).filter(
        ExternalUser.bind_user == user.user_id,
        ExternalUser.app_id == app_id,
    ).delete()
    db.commit()


def get_external_user(db: Session, user_id: str, app_id: str) -> Optional[str]:
    """Get external user binding."""
    ext = db.query(ExternalUser).filter(
        ExternalUser.bind_user == user_id,
        ExternalUser.app_id == app_id,
    ).first()
    return ext.app_user if ext else None
