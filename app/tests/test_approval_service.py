"""Tests for approval service.

Covers approval flow parsing and configuration listing.
Note: Tests that require INSERT into tables with BigInteger PK
(approval_status, system_config, notification) are skipped due to
SQLite limitations — those PKs don't auto-increment in SQLite.
These should be tested against a real PostgreSQL database.
"""
import json
import uuid
import pytest

from app.services.approval_service import (
    fetch_next_step,
    list_approval_configs,
    get_approval_state,
)
from app.models import RobotApprovalConfig


def _create_approval_config(db, entity: str = "TestEntity") -> RobotApprovalConfig:
    """Helper to create an approval config with a multi-step flow."""
    config_id = uuid.uuid4().hex[:20]
    flow_def = {
        "nodes": [
            {
                "id": "node_1",
                "name": "主管审批",
                "type": "approval",
                "approverMode": "ALL",
                "approverSpec": ["approver_user_1"],
                "nextNode": "node_2",
            },
            {
                "id": "node_2",
                "name": "经理审批",
                "type": "approval",
                "approverMode": "ALL",
                "approverSpec": ["approver_user_2"],
                "nextNode": None,
            },
        ]
    }
    config = RobotApprovalConfig(
        config_id=config_id,
        name="Test Approval Flow",
        belong_entity=entity,
        flow_definition=json.dumps(flow_def),
        is_disabled=False,
    )
    db.add(config)
    db.commit()
    return config


class TestApprovalFlowParsing:
    """Tests for the flow definition parser."""

    def test_fetch_next_step_parses_flow(self, db):
        """fetch_next_step should parse flow_definition and return first node info."""
        config = _create_approval_config(db)

        result = fetch_next_step(db, "record_001", config.config_id, "user_1")
        assert "error" not in result
        assert result["node_id"] == "node_1"
        assert result["node_name"] == "主管审批"
        assert result["approver_spec"] == ["approver_user_1"]
        assert result["is_last_step"] is False

    def test_fetch_next_step_empty_flow(self, db):
        """fetch_next_step should return error for empty flow definition."""
        config_id = uuid.uuid4().hex[:20]
        empty_config = RobotApprovalConfig(
            config_id=config_id,
            name="Empty Flow",
            belong_entity="TestEntity",
            flow_definition="",
        )
        db.add(empty_config)
        db.commit()

        result = fetch_next_step(db, "record_001", config_id, "user_1")
        assert "error" in result

    def test_fetch_next_step_last_step(self, db):
        """fetch_next_step should mark as last step when nextNode is None."""
        config_id = uuid.uuid4().hex[:20]
        single_node_flow = {
            "nodes": [
                {
                    "id": "node_only",
                    "name": "唯一审批",
                    "type": "approval",
                    "approverMode": "ALL",
                    "approverSpec": ["approver_1"],
                    "nextNode": None,
                },
            ]
        }
        config = RobotApprovalConfig(
            config_id=config_id,
            name="Single Step",
            belong_entity="TestEntity",
            flow_definition=json.dumps(single_node_flow),
        )
        db.add(config)
        db.commit()

        result = fetch_next_step(db, "record_001", config_id, "user_1")
        assert result["is_last_step"] is True
        assert result["node_id"] == "node_only"

    def test_get_approval_state_draft(self, db):
        """get_approval_state should return DRAFT for a new record."""
        state = get_approval_state(db, "nonexistent_record", "user_1")
        assert state["state"] == 0  # DRAFT

    def test_list_approval_configs(self, db):
        """list_approval_configs should return all configs."""
        _create_approval_config(db, "EntityA")
        _create_approval_config(db, "EntityB")

        configs = list_approval_configs(db)
        assert len(configs) >= 2
