"""Test fixtures — in-memory SQLite database, test client, auth helpers."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import get_db
from app.main import app
from app.models import Base
from app.services.auth_service import _hash_password, create_access_token

# In-memory SQLite for tests
TEST_DATABASE_URL = "sqlite:///./test.db"
test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestSession = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestSession()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """Create all tables once per test session."""
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(autouse=True)
def clean_tables():
    """Clean all tables before each test for isolation."""
    from app.models import (
        User, Department, LoginLog, ExternalUser, Notification,
        Attachment, AttachmentFolder, DashboardConfig, ChartConfig,
        ProjectConfig, ProjectPlanConfig, ProjectTask, RobotTriggerConfig,
        RobotApprovalConfig, RobotApprovalStep, ApprovalStatus,
        TaskComment, TaskTag,
    )
    # Delete in reverse dependency order
    db = TestSession()
    try:
        for model in [
            TaskComment, TaskTag, ApprovalStatus, RobotApprovalStep,
            RobotApprovalConfig, RobotTriggerConfig, ProjectTask,
            ProjectPlanConfig, ProjectConfig, ChartConfig, DashboardConfig,
            Notification, Attachment, AttachmentFolder, ExternalUser,
            LoginLog, User, Department,
        ]:
            db.query(model).delete()
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()
    yield


@pytest.fixture()
def client():
    """Provide a test client."""
    return TestClient(app)


@pytest.fixture()
def test_user():
    """Create a test user and return (user, token, headers)."""
    import uuid
    from app.models import User

    db = TestSession()
    try:
        user_id = uuid.uuid4().hex[:20]
        user = User(
            user_id=user_id,
            login_name=f"testuser_{user_id[:8]}",
            email=f"test_{user_id[:8]}@example.com",
            password=_hash_password("Test1234!"),
            full_name="Test User",
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        token = create_access_token(user.user_id)
        headers = {"Authorization": f"Bearer {token}"}
        return user, token, headers
    finally:
        db.close()
