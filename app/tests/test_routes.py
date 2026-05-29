"""Route tests — real business logic tests with authenticated requests."""
import pytest
from fastapi.testclient import TestClient


# ── Public routes (no auth required) ────────────────────────────────


class TestPublicRoutes:
    """Tests for routes that don't require authentication."""

    def test_health_check(self, client: TestClient):
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"

    def test_signup_page(self, client: TestClient):
        response = client.get("/user/signup")
        assert response.status_code == 200
        assert "text/html" in response.headers.get("content-type", "")

    def test_forgot_passwd_page(self, client: TestClient):
        response = client.get("/user/forgot-passwd")
        assert response.status_code == 200

    def test_logout(self, client: TestClient):
        response = client.get("/user/logout")
        assert response.status_code == 200
        assert response.json()["ok"] is True

    def test_live_wallpaper(self, client: TestClient):
        response = client.get("/user/live-wallpaper")
        assert response.status_code == 200
        assert "enabled" in response.json()

    def test_captcha(self, client: TestClient):
        response = client.get("/user/captcha")
        assert response.status_code == 200
        assert response.json()["ok"] is True


# ── Auth flow tests ─────────────────────────────────────────────────


class TestSignupFlow:
    """Test the public signup flow."""

    def test_signup_email_vcode(self, client: TestClient):
        response = client.post("/user/signup-email-vcode", json={"email": "new@example.com"})
        assert response.status_code == 200
        assert response.json()["ok"] is True

    def test_signup_email_vcode_duplicate(self, client: TestClient, test_user):
        user, _, _ = test_user
        response = client.post("/user/signup-email-vcode", json={"email": user.email})
        assert response.status_code == 400

    def test_checkout_name_available(self, client: TestClient):
        response = client.post("/user/checkout-name", json={"name": "totally_new_name_xyz"})
        assert response.status_code == 200
        assert response.json()["available"] is True

    def test_checkout_name_taken(self, client: TestClient, test_user):
        user, _, _ = test_user
        response = client.post("/user/checkout-name", json={"name": user.login_name})
        assert response.status_code == 200
        assert response.json()["available"] is False


class TestLoginFlow:
    """Test the login flow."""

    def test_login_success(self, client: TestClient, test_user):
        user, _, _ = test_user
        response = client.post("/user/user-login", json={
            "username": user.login_name,
            "password": "Test1234!",
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user_id"] == user.user_id

    def test_login_wrong_password(self, client: TestClient, test_user):
        user, _, _ = test_user
        response = client.post("/user/user-login", json={
            "username": user.login_name,
            "password": "wrong_password",
        })
        assert response.status_code == 401

    def test_check_login_page(self, client: TestClient):
        """Login page is now public and renders HTML template."""
        response = client.get("/user/login")
        assert response.status_code == 200
        assert "text/html" in response.headers.get("content-type", "")


# ── Authenticated routes ────────────────────────────────────────────


class TestUserSettings:
    """Test user settings routes with authentication."""

    def test_get_user_settings(self, client: TestClient, test_user):
        """Settings page now renders HTML template."""
        _, _, headers = test_user
        response = client.get("/settings/user", headers=headers)
        assert response.status_code == 200
        assert "text/html" in response.headers.get("content-type", "")

    def test_login_logs(self, client: TestClient, test_user):
        _, _, headers = test_user
        response = client.get("/settings/user/login-logs", headers=headers)
        assert response.status_code == 200
        assert "data" in response.json()

    def test_passwd_expired_page(self, client: TestClient, test_user):
        """Password expired page now renders HTML template."""
        _, _, headers = test_user
        response = client.get("/settings/passwd-expired", headers=headers)
        assert response.status_code == 200
        assert "text/html" in response.headers.get("content-type", "")

    def test_save_passwd_wrong_old(self, client: TestClient, test_user):
        _, _, headers = test_user
        response = client.post("/settings/user/save-passwd", headers=headers, json={
            "old_passwd": "wrong_old",
            "new_passwd": "NewPass1234!",
        })
        assert response.status_code == 400

    def test_ucenter_bind_query(self, client: TestClient, test_user):
        _, _, headers = test_user
        response = client.get("/settings/ucenter/bind-query", headers=headers)
        assert response.status_code == 200
        assert "bound" in response.json()

    def test_unauthenticated_access(self, client: TestClient):
        response = client.get("/settings/user")
        assert response.status_code == 401


class TestAccount:
    """Test account routes with authentication."""

    def test_user_info(self, client: TestClient, test_user):
        user, _, headers = test_user
        response = client.get("/account/user-info", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["user_id"] == user.user_id
        assert data["full_name"] == user.full_name

    def test_check_user_status(self, client: TestClient, test_user):
        user, _, headers = test_user
        response = client.post("/account/check-user-status", headers=headers, json={
            "user_id": user.user_id,
        })
        assert response.status_code == 200
        assert response.json()["is_active"] is True

    def test_check_user_status_not_found(self, client: TestClient, test_user):
        _, _, headers = test_user
        response = client.post("/account/check-user-status", headers=headers, json={
            "user_id": "nonexistent",
        })
        assert response.status_code == 404

    def test_user_avatar_default(self, client: TestClient, test_user):
        _, _, headers = test_user
        response = client.get("/account/user-avatar", headers=headers)
        assert response.status_code == 200


class TestNotifications:
    """Test notification routes with authentication."""

    def test_check_state(self, client: TestClient, test_user):
        _, _, headers = test_user
        response = client.get("/notification/check-state", headers=headers)
        assert response.status_code == 200
        assert "unread_count" in response.json()

    def test_list_messages(self, client: TestClient, test_user):
        _, _, headers = test_user
        response = client.get("/notification/messages", headers=headers)
        assert response.status_code == 200
        assert "data" in response.json()

    def test_list_approvals(self, client: TestClient, test_user):
        _, _, headers = test_user
        response = client.get("/notification/approvals", headers=headers)
        assert response.status_code == 200
        assert "data" in response.json()

    def test_make_read_all(self, client: TestClient, test_user):
        _, _, headers = test_user
        response = client.post("/notification/make-read", headers=headers, json={
            "read_all": True,
        })
        assert response.status_code == 200

    def test_make_read_no_params(self, client: TestClient, test_user):
        _, _, headers = test_user
        response = client.post("/notification/make-read", headers=headers, json={})
        assert response.status_code == 400

    def test_notifications_page(self, client: TestClient, test_user):
        _, _, headers = test_user
        response = client.get("/notifications", headers=headers)
        assert response.status_code == 200

    def test_todo_page(self, client: TestClient, test_user):
        _, _, headers = test_user
        response = client.get("/notifications/todo", headers=headers)
        assert response.status_code == 200


class TestDashboard:
    """Test dashboard routes with authentication."""

    def test_list_dashboards(self, client: TestClient, test_user):
        _, _, headers = test_user
        response = client.get("/dashboard/list", headers=headers)
        assert response.status_code == 200
        assert "data" in response.json()

    def test_dashboard_home(self, client: TestClient, test_user):
        _, _, headers = test_user
        response = client.get("/dashboard/home", headers=headers)
        assert response.status_code == 200

    def test_dashboard_not_found(self, client: TestClient, test_user):
        _, _, headers = test_user
        response = client.get("/dashboard/nonexistent", headers=headers)
        assert response.status_code == 404

    def test_chart_preview(self, client: TestClient, test_user):
        _, _, headers = test_user
        response = client.post("/dashboard/chart/preview", headers=headers, json={
            "chart_type": "TABLE",
            "belong_entity": "Account",
        })
        assert response.status_code == 200


class TestTriggers:
    """Test trigger routes with authentication."""

    def test_available_actions(self, client: TestClient, test_user):
        _, _, headers = test_user
        response = client.get("/admin/robot/trigger/available-actions", headers=headers)
        assert response.status_code == 200
        data = response.json()["data"]
        assert len(data) > 0
        assert data[0]["type"] == "SENDNOTIFICATION"

    def test_trigger_list(self, client: TestClient, test_user):
        _, _, headers = test_user
        response = client.get("/admin/robot/trigger/list", headers=headers)
        assert response.status_code == 200
        assert "data" in response.json()

    def test_trigger_editor_page(self, client: TestClient, test_user):
        """Trigger editor now renders HTML template for any id."""
        _, _, headers = test_user
        response = client.get("/admin/robot/trigger/nonexistent", headers=headers)
        assert response.status_code == 200
        assert "text/html" in response.headers.get("content-type", "")

    def test_available_entities(self, client: TestClient, test_user):
        _, _, headers = test_user
        response = client.get("/admin/robot/trigger/available-entities?action_type=SENDNOTIFICATION", headers=headers)
        assert response.status_code == 200

    def test_sendnotification_atypes(self, client: TestClient, test_user):
        _, _, headers = test_user
        response = client.get("/admin/robot/trigger/sendnotification-atypes", headers=headers)
        assert response.status_code == 200
        assert len(response.json()["data"]) == 3

    def test_group_aggregation_entities(self, client: TestClient, test_user):
        _, _, headers = test_user
        response = client.get("/admin/robot/trigger/group-aggregation-entities", headers=headers)
        assert response.status_code == 200

    def test_field_writeback_entities(self, client: TestClient, test_user):
        _, _, headers = test_user
        response = client.get("/admin/robot/trigger/field-writeback-entities", headers=headers)
        assert response.status_code == 200

    def test_field_writeback_custom_funcs(self, client: TestClient, test_user):
        _, _, headers = test_user
        response = client.get("/admin/robot/trigger/field-writeback-custom-funcs", headers=headers)
        assert response.status_code == 200
        assert len(response.json()["data"]) == 5

    def test_verify_formula(self, client: TestClient, test_user):
        _, _, headers = test_user
        response = client.post("/admin/robot/trigger/verify-formula", headers=headers, json={})
        assert response.status_code == 200
        assert response.json()["valid"] is True


class TestApproval:
    """Test approval routes with authentication."""

    def test_approval_admin_list(self, client: TestClient, test_user):
        """Approval admin list page now renders HTML template."""
        _, _, headers = test_user
        response = client.get("/admin/robot/approvals", headers=headers)
        assert response.status_code == 200
        assert "text/html" in response.headers.get("content-type", "")

    def test_approval_admin_editor_page(self, client: TestClient, test_user):
        """Approval editor now renders HTML template for any id."""
        _, _, headers = test_user
        response = client.get("/admin/robot/approval/nonexistent", headers=headers)
        assert response.status_code == 200
        assert "text/html" in response.headers.get("content-type", "")

    def test_workable(self, client: TestClient, test_user):
        _, _, headers = test_user
        response = client.get("/app/entity/approval/workable?record_id=test123", headers=headers)
        assert response.status_code == 200
        assert "data" in response.json()

    def test_approval_state(self, client: TestClient, test_user):
        _, _, headers = test_user
        response = client.get("/app/entity/approval/state?record_id=test123", headers=headers)
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["state"] == 0  # DRAFT

    def test_fetch_worked_steps(self, client: TestClient, test_user):
        _, _, headers = test_user
        response = client.get("/app/entity/approval/fetch-workedsteps?record_id=test123", headers=headers)
        assert response.status_code == 200


class TestProject:
    """Test project routes with authentication."""

    def test_project_search_empty(self, client: TestClient, test_user):
        _, _, headers = test_user
        response = client.get("/project/search?q=nonexistent", headers=headers)
        assert response.status_code == 200
        assert response.json()["data"] == []

    def test_project_page(self, client: TestClient, test_user):
        """Project tasks page now renders HTML template for any id."""
        _, _, headers = test_user
        response = client.get("/project/nonexistent/tasks", headers=headers)
        assert response.status_code == 200
        assert "text/html" in response.headers.get("content-type", "")

    def test_task_page(self, client: TestClient, test_user):
        """Task view page now renders HTML template for any id."""
        _, _, headers = test_user
        response = client.get("/project/task/nonexistent", headers=headers)
        assert response.status_code == 200
        assert "text/html" in response.headers.get("content-type", "")

    def test_task_list_empty(self, client: TestClient, test_user):
        _, _, headers = test_user
        response = client.get("/project/tasks/list", headers=headers)
        assert response.status_code == 200
        assert response.json()["data"]["count"] == 0

    def test_alist(self, client: TestClient, test_user):
        _, _, headers = test_user
        response = client.get("/project/alist", headers=headers)
        assert response.status_code == 200
        assert "data" in response.json()

    def test_related_task_list(self, client: TestClient, test_user):
        _, _, headers = test_user
        response = client.post("/project/tasks/related-list", headers=headers, json={
            "task_id": "nonexistent",
        })
        assert response.status_code == 200
        assert response.json()["data"] == []


class TestFiles:
    """Test file routes with authentication."""

    def test_file_home(self, client: TestClient, test_user):
        _, _, headers = test_user
        response = client.get("/files/home", headers=headers)
        assert response.status_code == 200

    def test_list_files_empty(self, client: TestClient, test_user):
        _, _, headers = test_user
        response = client.get("/files/list-file", headers=headers)
        assert response.status_code == 200
        assert response.json()["data"] == []

    def test_list_folders_empty(self, client: TestClient, test_user):
        _, _, headers = test_user
        response = client.get("/files/tree-folder", headers=headers)
        assert response.status_code == 200

    def test_list_entities_empty(self, client: TestClient, test_user):
        _, _, headers = test_user
        response = client.get("/files/tree-entity", headers=headers)
        assert response.status_code == 200

    def test_check_readable_not_found(self, client: TestClient, test_user):
        _, _, headers = test_user
        response = client.post("/files/check-readable", headers=headers, json={
            "file_id": "nonexistent",
        })
        assert response.status_code == 403

    def test_delete_files_empty(self, client: TestClient, test_user):
        _, _, headers = test_user
        response = client.post("/files/delete-files", headers=headers, json={
            "file_ids": [],
        })
        assert response.status_code == 200
        assert response.json()["deleted"] == 0

    def test_move_files_empty(self, client: TestClient, test_user):
        _, _, headers = test_user
        response = client.post("/files/move-files", headers=headers, json={
            "file_ids": [],
        })
        assert response.status_code == 200
        assert response.json()["moved"] == 0

    def test_check_files_empty(self, client: TestClient, test_user):
        _, _, headers = test_user
        response = client.post("/files/check-files", headers=headers, json={
            "filenames": [],
        })
        assert response.status_code == 200
        assert response.json()["conflicts"] == {}
