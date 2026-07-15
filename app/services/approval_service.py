"""Approval workflow service with multi-step flow support.

The flow_definition is stored as JSON with structure:
    {"nodes": [
        {"id": "node1", "name": "主管审批", "type": "approval",
         "approverMode": "ALL", "approverSpec": ["user1", "user2"],
         "nextNode": "node2"},
        {"id": "node2", "name": "经理审批", "type": "approval",
         "approverMode": "ANY", "approverSpec": ["user3"],
         "nextNode": null}
    ]}
"""
import json
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.models import RobotApprovalConfig, RobotApprovalStep, ApprovalStatus

# Approval states
STATE_DRAFT = 0
STATE_PROCESSING = 1
STATE_APPROVED = 2
STATE_REJECTED = 3


# ── Flow parsing ──────────────────────────────────────────────────────

def _parse_flow(approval: RobotApprovalConfig) -> list[dict]:
    """Parse the flow_definition JSON into a list of node dicts."""
    if not approval.flow_definition:
        return []
    try:
        fd = json.loads(approval.flow_definition) if isinstance(approval.flow_definition, str) else approval.flow_definition
        return fd.get("nodes", [])
    except (json.JSONDecodeError, AttributeError):
        return []


def _find_node(nodes: list[dict], node_id: Optional[str]) -> Optional[dict]:
    """Find a node by its ID."""
    if not node_id:
        return None
    for n in nodes:
        if n.get("id") == node_id:
            return n
    return None


def _get_first_node(nodes: list[dict]) -> Optional[dict]:
    """Get the first node in the flow."""
    return nodes[0] if nodes else None


def _get_next_node(nodes: list[dict], current_node_id: Optional[str]) -> Optional[dict]:
    """Get the next node after the current one."""
    current = _find_node(nodes, current_node_id)
    if not current:
        return None
    next_id = current.get("nextNode")
    if not next_id:
        return None
    return _find_node(nodes, next_id)


def _create_step(db: Session, record_id: str, approval_id: str, node: dict, approver: Optional[str] = None) -> RobotApprovalStep:
    """Create a new approval step from a flow node."""
    step = RobotApprovalStep(
        step_id=uuid.uuid4().hex[:20],
        record_id=record_id,
        approval_id=approval_id,
        node=node.get("id", ""),
        state=STATE_DRAFT,
        approver=approver or "",
    )
    db.add(step)
    return step


# ── Public API ────────────────────────────────────────────────────────

def get_workable_approvals(db: Session, record_id: str, user_id: str) -> list[dict]:
    """Get available approval definitions for a record."""
    approvals = db.query(RobotApprovalConfig).filter(
        RobotApprovalConfig.is_disabled == False,
    ).order_by(RobotApprovalConfig.name).all()
    return [
        {"id": a.config_id, "name": a.name}
        for a in approvals
    ]


def get_approval_list(db: Session, entity: str, valid_only: bool = False) -> list[dict]:
    """Get approval definitions for an entity."""
    query = db.query(RobotApprovalConfig).filter(
        RobotApprovalConfig.belong_entity == entity,
        RobotApprovalConfig.is_disabled == False,
    )
    approvals = query.order_by(RobotApprovalConfig.name).all()
    return [
        {
            "id": a.config_id,
            "name": a.name,
            "entity": a.belong_entity,
            "enabled": not a.is_disabled,
            "isDisabled": a.is_disabled,
            "modifiedOn": a.modified_on.isoformat() if a.modified_on else None,
        }
        for a in approvals
    ]


def get_approval_state(db: Session, record_id: str, user_id: str) -> dict:
    """Get the approval state of a record."""
    status = db.query(ApprovalStatus).filter(
        ApprovalStatus.record_id == record_id
    ).first()

    data = {"record_id": record_id}
    if not status:
        data["state"] = STATE_DRAFT
        return data

    data["state"] = status.state
    data["approval_id"] = status.approval_id

    if status.state == STATE_PROCESSING:
        steps = db.query(RobotApprovalStep).filter(
            RobotApprovalStep.record_id == record_id,
            RobotApprovalStep.approval_id == status.approval_id,
            RobotApprovalStep.state == STATE_DRAFT,
            RobotApprovalStep.is_canceled == False,
        ).all()
        data["current_steps"] = [
            {"step_id": s.step_id, "approver": s.approver, "node": s.node, "state": s.state}
            for s in steps
        ]
        for s in steps:
            if s.approver == user_id:
                data["im_approver"] = True
                data["im_approve_state"] = s.state
                break
        if status.submitter == user_id:
            data["can_cancel"] = True
            data["can_urge"] = True

    if status.state == STATE_APPROVED:
        data["can_revoke"] = True

    return data


def fetch_next_step(db: Session, record_id: str, approval_id: str, user_id: str) -> dict:
    """Fetch the next step info by parsing the actual flow definition."""
    approval = db.query(RobotApprovalConfig).filter(
        RobotApprovalConfig.config_id == approval_id
    ).first()
    if not approval:
        return {"error": "Approval not found"}

    nodes = _parse_flow(approval)
    if not nodes:
        return {"error": "审批流程定义为空，请先在设计器中配置流程节点"}

    first_node = _get_first_node(nodes)
    if not first_node:
        return {"error": "流程定义无效"}

    # Determine approvers from the first node
    approver_mode = first_node.get("approverMode", "ALL")
    approver_spec = first_node.get("approverSpec", [])

    return {
        "node_id": first_node.get("id", ""),
        "node_name": first_node.get("name", ""),
        "node_type": first_node.get("type", "approval"),
        "approver_mode": approver_mode,
        "approver_spec": approver_spec,
        "next_approvers": approver_spec,
        "approver_self_selecting": approver_mode == "SELF",
        "is_last_step": first_node.get("nextNode") is None,
    }


def fetch_worked_steps(db: Session, record_id: str) -> list[dict]:
    """Fetch completed steps for a record."""
    steps = db.query(RobotApprovalStep).filter(
        RobotApprovalStep.record_id == record_id,
    ).order_by(RobotApprovalStep.created_on).all()
    return [
        {
            "step_id": s.step_id,
            "node": s.node,
            "approver": s.approver,
            "state": s.state,
            "remark": s.remark,
            "created_on": s.created_on.isoformat() if s.created_on else None,
        }
        for s in steps
    ]


def fetch_back_steps(db: Session, record_id: str) -> list[dict]:
    """Fetch steps that can be returned to."""
    steps = db.query(RobotApprovalStep).filter(
        RobotApprovalStep.record_id == record_id,
        RobotApprovalStep.state == STATE_APPROVED,
    ).order_by(RobotApprovalStep.created_on).all()
    return [
        {"step_id": s.step_id, "node": s.node, "approver": s.approver}
        for s in steps
    ]


def do_submit(db: Session, record_id: str, approval_id: str, user_id: str, approver: Optional[str] = None) -> dict:
    """Submit a record for approval.

    Creates the first step based on the flow definition.
    If the first node specifies approvers, use them; otherwise use the
    provided approver (for self-selecting mode).
    """
    approval = db.query(RobotApprovalConfig).filter(
        RobotApprovalConfig.config_id == approval_id
    ).first()
    if not approval:
        return {"error": "审批流程不存在"}

    nodes = _parse_flow(approval)
    first_node = _get_first_node(nodes)

    # Create approval status
    status = ApprovalStatus(
        record_id=record_id,
        approval_id=approval_id,
        state=STATE_PROCESSING,
        submitter=user_id,
        prev_step_node=first_node.get("id", "") if first_node else "ROOT",
    )
    db.add(status)

    if first_node:
        # Determine approvers
        approver_mode = first_node.get("approverMode", "ALL")
        approver_spec = first_node.get("approverSpec", [])

        if approver_mode == "SELF" and approver:
            # User selected their own approver
            _create_step(db, record_id, approval_id, first_node, approver)
        elif approver_spec:
            # Use configured approvers
            for a in approver_spec:
                _create_step(db, record_id, approval_id, first_node, a)
        else:
            # Fallback: create a step with no specific approver
            _create_step(db, record_id, approval_id, first_node)
    else:
        # No flow definition — create a minimal step
        step = RobotApprovalStep(
            step_id=uuid.uuid4().hex[:20],
            record_id=record_id,
            approval_id=approval_id,
            node="ROOT",
            state=STATE_DRAFT,
            approver=user_id,
        )
        db.add(step)

    db.commit()
    return {"state": STATE_PROCESSING}


def do_approve(db: Session, step_id: str, user_id: str, remark: str = "") -> dict:
    """Approve a step and auto-advance to the next node."""
    step = db.query(RobotApprovalStep).filter(RobotApprovalStep.step_id == step_id).first()
    if not step:
        return {"error": "审批步骤不存在"}
    if step.approver != user_id:
        return {"error": "您不是此步骤的审批人"}

    step.state = STATE_APPROVED
    step.remark = remark
    step.modified_on = datetime.utcnow()

    # Check pending steps in current node
    pending_in_node = db.query(RobotApprovalStep).filter(
        RobotApprovalStep.record_id == step.record_id,
        RobotApprovalStep.approval_id == step.approval_id,
        RobotApprovalStep.node == step.node,
        RobotApprovalStep.state == STATE_DRAFT,
        RobotApprovalStep.is_canceled == False,
        RobotApprovalStep.step_id != step_id,
    ).count()

    if pending_in_node > 0:
        # Still waiting for other approvers in this node
        db.commit()
        return {"state": STATE_APPROVED, "node_complete": False}

    # This node is complete — advance to next node
    approval = db.query(RobotApprovalConfig).filter(
        RobotApprovalConfig.config_id == step.approval_id
    ).first()

    if approval:
        nodes = _parse_flow(approval)
        next_node = _get_next_node(nodes, step.node)

        if next_node:
            # Create step(s) for the next node
            approver_mode = next_node.get("approverMode", "ALL")
            approver_spec = next_node.get("approverSpec", [])

            if approver_spec:
                for a in approver_spec:
                    _create_step(db, step.record_id, step.approval_id, next_node, a)
            else:
                _create_step(db, step.record_id, step.approval_id, next_node)

            db.commit()
            return {"state": STATE_APPROVED, "node_complete": True, "next_node": next_node.get("id")}

    # No more nodes — mark as fully approved
    status = db.query(ApprovalStatus).filter(
        ApprovalStatus.record_id == step.record_id
    ).first()
    if status:
        status.state = STATE_APPROVED
        status.prev_step_node = step.node

    db.commit()
    return {"state": STATE_APPROVED, "node_complete": True, "approval_complete": True}


def do_reject(db: Session, step_id: str, user_id: str, remark: str = "") -> dict:
    """Reject an approval step."""
    step = db.query(RobotApprovalStep).filter(RobotApprovalStep.step_id == step_id).first()
    if not step:
        return {"error": "审批步骤不存在"}
    if step.approver != user_id:
        return {"error": "您不是此步骤的审批人"}

    step.state = STATE_REJECTED
    step.remark = remark
    step.modified_on = datetime.utcnow()

    # Mark entire approval as rejected
    status = db.query(ApprovalStatus).filter(
        ApprovalStatus.record_id == step.record_id
    ).first()
    if status:
        status.state = STATE_REJECTED

    # Cancel all pending steps
    db.query(RobotApprovalStep).filter(
        RobotApprovalStep.record_id == step.record_id,
        RobotApprovalStep.state == STATE_DRAFT,
    ).update({"is_canceled": True})

    db.commit()
    return {"state": STATE_REJECTED}


def do_cancel(db: Session, record_id: str, user_id: str) -> dict:
    """Cancel an approval."""
    status = db.query(ApprovalStatus).filter(
        ApprovalStatus.record_id == record_id,
        ApprovalStatus.submitter == user_id,
    ).first()
    if not status:
        return {"error": "无法取消此审批"}
    status.state = STATE_DRAFT
    db.query(RobotApprovalStep).filter(
        RobotApprovalStep.record_id == record_id,
        RobotApprovalStep.state == STATE_DRAFT,
    ).update({"is_canceled": True})
    db.commit()
    return {"state": STATE_DRAFT}


def do_urge(db: Session, record_id: str, user_id: str) -> dict:
    """Urge an approval (send reminder)."""
    # In production: send notification to approver
    return {"msg": "催办通知已发送"}


def do_revoke(db: Session, record_id: str, user_id: str) -> dict:
    """Revoke an approved approval."""
    status = db.query(ApprovalStatus).filter(
        ApprovalStatus.record_id == record_id,
        ApprovalStatus.state == STATE_APPROVED,
    ).first()
    if not status:
        return {"error": "未找到已批准的审批"}
    if status.submitter != user_id:
        return {"error": "只能撤回自己的审批"}
    status.state = STATE_DRAFT
    db.commit()
    return {"state": STATE_DRAFT}


def do_referral(db: Session, step_id: str, to_user_id: str, user_id: str) -> dict:
    """Refer an approval step to another user."""
    step = db.query(RobotApprovalStep).filter(RobotApprovalStep.step_id == step_id).first()
    if not step:
        return {"error": "步骤不存在"}
    if step.approver != user_id:
        return {"error": "只能转审自己的步骤"}
    step.approver = to_user_id
    db.commit()
    return {"referred_to": to_user_id}


def do_countersign(db: Session, step_id: str, user_id: str, remark: str = "") -> dict:
    """Add a countersign opinion."""
    step = db.query(RobotApprovalStep).filter(RobotApprovalStep.step_id == step_id).first()
    if not step:
        return {"error": "步骤不存在"}
    if step.approver != user_id:
        return {"error": "只能会签自己的步骤"}
    step.state = STATE_APPROVED
    step.remark = remark
    db.commit()
    return {"state": STATE_APPROVED}


def get_flow_definition(db: Session, approval_id: str) -> Optional[dict]:
    """Get approval flow definition."""
    approval = db.query(RobotApprovalConfig).filter(
        RobotApprovalConfig.config_id == approval_id
    ).first()
    if not approval:
        return None

    nodes = _parse_flow(approval)
    return {
        "config_id": approval.config_id,
        "name": approval.name,
        "belong_entity": approval.belong_entity,
        "flow_definition": {"nodes": nodes} if nodes else approval.flow_definition,
    }


def list_approval_configs(db: Session) -> list[dict]:
    """List all approval configurations."""
    configs = db.query(RobotApprovalConfig).order_by(RobotApprovalConfig.name).all()
    return [
        {
            "config_id": c.config_id,
            "name": c.name,
            "belong_entity": c.belong_entity,
            "is_disabled": c.is_disabled,
        }
        for c in configs
    ]
