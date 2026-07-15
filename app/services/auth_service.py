"""Authentication service login, signup, password reset, JWT tokens."""
import hashlib
import random
import string
from datetime import datetime, timedelta
from typing import Optional

import jwt
from sqlalchemy.orm import Session

from app.models import User, LoginLog
from app.config import settings

# JWT config
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480

# In-memory verification code store (replace with Redis in production)
_vcode_store: dict[str, tuple[str, datetime]] = {}


def _hash_password(password: str) -> str:
    """SHA-256 password hashing, matching Java's EncryptUtils.toSHA256Hex."""
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def _generate_vcode(length: int = 6) -> str:
    return "".join(random.choices(string.digits, k=length))


def store_vcode(email: str, purpose: int = 0) -> str:
    """Generate and store a verification code. Returns the code."""
    code = _generate_vcode()
    _vcode_store[f"{purpose}:{email}"] = (code, datetime.utcnow() + timedelta(minutes=15))
    return code


def verify_vcode(email: str, code: str, purpose: int = 0) -> bool:
    """Verify and consume a verification code."""
    key = f"{purpose}:{email}"
    entry = _vcode_store.get(key)
    if not entry:
        return False
    stored_code, expires = entry
    if datetime.utcnow() > expires:
        _vcode_store.pop(key, None)
        return False
    if stored_code != code:
        return False
    _vcode_store.pop(key, None)
    return True


def check_user_exists(db: Session, login_name: str, email: str) -> Optional[str]:
    """Check if login_name or email already taken. Returns error message or None."""
    if db.query(User).filter(User.login_name == login_name).first():
        return "Login name already exists"
    if db.query(User).filter(User.email == email).first():
        return "Email already exists"
    return None


def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
    """Authenticate user by login_name + password. Returns User or None."""
    hashed = _hash_password(password)
    user = db.query(User).filter(
        User.login_name == username,
        User.password == hashed,
    ).first()
    if user and user.is_active and not user.is_disabled:
        return user
    return None


def create_access_token(user_id: str, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> Optional[str]:
    """Decode JWT token, return user_id or None."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except jwt.PyJWTError:
        return None


def login_user(db: Session, user: User, ip_addr: str = "", user_agent: str = "") -> dict:
    """Perform login: create token, log login event."""
    token = create_access_token(user.user_id)
    try:
        log = LoginLog(
            user_id=user.user_id,
            login_time=datetime.utcnow(),
            ip_addr=ip_addr,
            user_agent=user_agent,
        )
        db.add(log)
        db.commit()
    except Exception:
        db.rollback()
    return {"access_token": token, "token_type": "bearer", "user_id": user.user_id}


def register_user(db: Session, email: str, login_name: str, full_name: str, password: str) -> User:
    """Register a new user with auto-generated password."""
    import uuid
    user_id = uuid.uuid4().hex[:20]
    auto_passwd = "".join(random.choices(string.ascii_letters + string.digits, k=6)) + "Rb!8"
    user = User(
        user_id=user_id,
        login_name=login_name,
        email=email,
        full_name=full_name,
        password=_hash_password(password or auto_passwd),
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def reset_password(db: Session, user: User, new_password: str) -> None:
    """Reset user password."""
    user.password = _hash_password(new_password)
    db.commit()


def change_password(db: Session, user: User, old_password: str, new_password: str) -> Optional[str]:
    """Change password. Returns error message or None on success."""
    if _hash_password(old_password) != user.password:
        return "Original password is incorrect"
    if old_password == new_password:
        return "New password must differ from the old one"
    user.password = _hash_password(new_password)
    db.commit()
    return None

