"""Tests for authentication service.

Covers JWT token creation/decoding, user authentication,
and password management.
"""
import pytest
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

from app.services.auth_service import (
    create_access_token,
    decode_access_token,
    authenticate_user,
    register_user,
    reset_password,
    change_password,
    login_user,
)
from app.models import User


class TestAuthService:
    """Test suite for auth_service functions."""

    def test_create_and_decode_token(self):
        """JWT token should encode and decode correctly."""
        user_id = "test_user_123"
        token = create_access_token(user_id)
        assert token is not None
        assert isinstance(token, str)

        decoded = decode_access_token(token)
        assert decoded == user_id

    def test_decode_invalid_token_returns_none(self):
        """Decoding an invalid token should return None."""
        result = decode_access_token("invalid.token.here")
        assert result is None

    def test_register_user_creates_user(self, db):
        """register_user should create a user in the database."""
        user = register_user(
            db,
            email="newuser@example.com",
            login_name="newuser",
            full_name="New User",
            password="secure_password_123",
        )
        assert user is not None
        assert user.user_id is not None
        assert user.email == "newuser@example.com"
        assert user.login_name == "newuser"
        assert user.password != "secure_password_123"  # Should be hashed
        assert user.is_active is True

        # Verify it's persisted
        fetched = db.query(User).filter(User.user_id == user.user_id).first()
        assert fetched is not None
        assert fetched.full_name == "New User"

    def test_register_user_without_password(self, db):
        """register_user should work without a password."""
        user = register_user(
            db,
            email="nopass@example.com",
            login_name="nopass_user",
            full_name="No Password User",
            password="",
        )
        assert user is not None

    def test_authenticate_valid_user(self, db):
        """authenticate_user should return user on valid credentials."""
        # Register a user first
        register_user(
            db,
            email="auth_test@example.com",
            login_name="auth_test",
            full_name="Auth Test",
            password="correct_password",
        )

        user = authenticate_user(db, "auth_test", "correct_password")
        assert user is not None
        assert user.login_name == "auth_test"

    def test_authenticate_by_email_fails(self, db):
        """authenticate_user should NOT work with email (only login_name)."""
        register_user(
            db,
            email="email_login@example.com",
            login_name="email_login_user",
            full_name="Email Login",
            password="pass123",
        )

        user = authenticate_user(db, "email_login@example.com", "pass123")
        assert user is None, "authenticate_user should only match by login_name"

        # But login by login_name should still work
        user = authenticate_user(db, "email_login_user", "pass123")
        assert user is not None

    def test_authenticate_wrong_password(self, db):
        """authenticate_user should return None on wrong password."""
        register_user(
            db,
            email="wrong_pass@example.com",
            login_name="wrong_pass",
            full_name="Wrong Pass",
            password="real_password",
        )

        user = authenticate_user(db, "wrong_pass", "wrong_password")
        assert user is None

    def test_authenticate_nonexistent_user(self, db):
        """authenticate_user should return None for unknown user."""
        user = authenticate_user(db, "nonexistent_user", "any_password")
        assert user is None

    def test_reset_password(self, db):
        """reset_password should update the user's password."""
        user = register_user(
            db,
            email="reset_test@example.com",
            login_name="reset_test",
            full_name="Reset Test",
            password="old_password",
        )

        reset_password(db, user, "new_secure_password")

        # Should be able to authenticate with new password
        authed = authenticate_user(db, "reset_test", "new_secure_password")
        assert authed is not None

        # Should NOT authenticate with old password
        old_auth = authenticate_user(db, "reset_test", "old_password")
        assert old_auth is None

    def test_change_password(self, db, sample_user):
        """change_password should update password after verifying old one."""
        user_id = sample_user["user_id"]
        user = db.query(User).filter(User.user_id == user_id).first()

        from app.services.auth_service import _hash_password
        user.password = _hash_password("original_pass")
        db.commit()

        result = change_password(db, user, "original_pass", "new_pass")
        assert result is None  # None means success

        authed = authenticate_user(db, sample_user["login_name"], "new_pass")
        assert authed is not None

    def test_change_password_wrong_old(self, db, sample_user):
        """change_password should fail with wrong old password."""
        user_id = sample_user["user_id"]
        user = db.query(User).filter(User.user_id == user_id).first()

        from app.services.auth_service import _hash_password
        user.password = _hash_password("original_pass")
        db.commit()

        result = change_password(db, user, "wrong_old", "new_pass")
        assert result is not None  # Error message on failure

    def test_login_user_creates_log(self, db, sample_user):
        """login_user should create a login log entry."""
        user_id = sample_user["user_id"]
        user = db.query(User).filter(User.user_id == user_id).first()

        from app.models import LoginLog
        result = login_user(db, user, ip_addr="192.168.1.1", user_agent="pytest")

        assert "access_token" in result
        assert result["user_id"] == user_id

        # Verify login log was created
        log = db.query(LoginLog).filter(
            LoginLog.user_id == user_id
        ).first()
        assert log is not None
        assert log.ip_addr == "192.168.1.1"
