"""Approval workflow service."""
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.models import RobotApprovalConfig, RobotApprovalStep, ApprovalStatus

# Approval states (matching Java enum)
STATE_DRAFT = 0
STATE_PROCESSING = 1
STATE_APPROVED = 2
STATE_REJECTED = 3


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
        {"id": a.config_id, "text": a.name}
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
        # Current steps
        steps = db.query(RobotApprovalStep).filter(
            RobotApprovalStep.record_id == record_id,
            RobotApprovalStep.approval_id == status.approval_id,
            RobotApprovalStep.state == STATE_DRAFT,
            RobotApprovalStep.is_canceled == False,
        ).all()
        data["current_steps"] = [
            {"step_id": s.step_id, "approver": s.approver, "state": s.state}
            for s in steps
        ]
        # Check if current user is an approver
        for s in steps:
            if s.approver == user_id:
                data["im_approver"] = True
                data["im_approve_state"] = s.state
                break
        # Submitter can cancel
        if status.submitter == user_id:
            data["can_cancel"] = True
            data["can_urge"] = True

    if status.state == STATE_APPROVED:
        data["can_revoke"] = True  # admin can revoke

    return data


def fetch_next_step(db: Session, record_id: str, approval_id: str, user_id: str) -> dict:
    """Fetch the next step info for submission."""
    approval = db.query(RobotApprovalConfig).filter(
        RobotApprovalConfig.config_id == approval_id
    ).first()
    if not approval:
        return {"error": "Approval not found"}

    return {
        "next_approvers": [],
        "next_ccs": [],
        "approver_self_selecting": True,
        "cc_self_selecting": False,
        "is_last_step": True,
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


def do_submit(db: Session, record_id: str, approval_id: str, user_id: str) -> dict:
    """Submit a record for approval."""
    # Create approval status
    status = ApprovalStatus(
        record_id=record_id,
        approval_id=approval_id,
        state=STATE_PROCESSING,
        submitter=user_id,
        prev_step_node="ROOT",
    )
    db.add(status)

    # Create first step
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
    return {"state": STATE_PROCESSING, "step_id": step.step_id}


def do_approve(db: Session, step_id: str, user_id: str, remark: str = "") -> dict:
    """Approve a step."""
    step = db.query(RobotApprovalStep).filter(RobotApprovalStep.step_id == step_id).first()
    if not step:
        return {"error": "Step not found"}
    if step.approver != user_id:
        return {"error": "You are not the approver for this step"}

    step.state = STATE_APPROVED
    step.remark = remark
    step.modified_on = datetime.utcnow()

    # Check if all steps approved
    pending = db.query(RobotApprovalStep).filter(
        RobotApprovalStep.record_id == step.record_id,
        RobotApprovalStep.approval_id == step.approval_id,
        RobotApprovalStep.state == STATE_DRAFT,
        RobotApprovalStep.is_canceled == False,
        RobotApprovalStep.step_id != step_id,
    ).count()

    if pending == 0:
        status = db.query(ApprovalStatus).filter(
            ApprovalStatus.record_id == step.record_id
        ).first()
        if status:
            status.state = STATE_APPROVED

    db.commit()
    return {"state": STATE_APPROVED}


def do_cancel(db: Session, record_id: str, user_id: str) -> dict:
    """Cancel an approval."""
    status = db.query(ApprovalStatus).filter(
        ApprovalStatus.record_id == record_id,
        ApprovalStatus.submitter == user_id,
    ).first()
    if not status:
        return {"error": "Cannot cancel this approval"}
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
    return {"msg": "Urge notification sent"}


def do_revoke(db: Session, record_id: str, user_id: str) -> dict:
    """Revoke an approved approval."""
    status = db.query(ApprovalStatus).filter(
        ApprovalStatus.record_id == record_id,
        ApprovalStatus.state == STATE_APPROVED,
    ).first()
    if not status:
        return {"error": "Approval not found or not approved"}
    status.state = STATE_DRAFT
    db.commit()
    return {"state": STATE_DRAFT}


def do_referral(db: Session, step_id: str, to_user_id: str, user_id: str) -> dict:
    """Refer an approval step to another user."""
    step = db.query(RobotApprovalStep).filter(RobotApprovalStep.step_id == step_id).first()
    if not step:
        return {"error": "Step not found"}
    step.approver = to_user_id
    db.commit()
    return {"referred_to": to_user_id}


def do_countersign(db: Session, step_id: str, user_id: str, remark: str = "") -> dict:
    """Add a countersign opinion."""
    step = db.query(RobotApprovalStep).filter(RobotApprovalStep.step_id == step_id).first()
    if not step:
        return {"error": "Step not found"}
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
    return {
        "config_id": approval.config_id,
        "name": approval.name,
        "belong_entity": approval.belong_entity,
        "flow_definition": approval.flow_definition,
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
