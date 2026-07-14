"""Shared test fixtures and configuration.

Uses a fresh in-memory SQLite database per test.
"""
import sys
from pathlib import Path

_project_root = str(Path(__file__).resolve().parent.parent.parent)
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from app.models import Base


@pytest.fixture
def db() -> Session:
    """Create a fresh in-memory SQLite database for each test."""
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    yield session
    session.close()
    engine.dispose()


@pytest.fixture
def sample_user(db: Session) -> dict:
    """Create and return a sample user for testing."""
    import uuid
    from app.models import User

    user_id = uuid.uuid4().hex[:20]
    user = User(
        user_id=user_id,
        login_name=f"test_user_{user_id[:8]}",
        email=f"test_{user_id[:8]}@example.com",
        password="hashed_password_placeholder",
        full_name="Test User",
        is_active=True,
        is_disabled=False,
    )
    db.add(user)
    db.commit()
    return {
        "user_id": user_id,
        "login_name": user.login_name,
        "email": user.email,
    }
