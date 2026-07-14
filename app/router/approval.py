"""Approval workflow routes — submit, approve, cancel, urge, revoke, referral, countersign."""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas.approval import (
    ApprovalSubmitRequest,
    ApprovalApproveRequest,
    ApprovalCancelRequest,
    ApprovalUrgeRequest,
    ApprovalRevokeRequest,
    ApprovalReferralRequest,
    ApprovalCountersignRequest,
)
from app.services import approval_service
from app.template_deps import templates

router = APIRouter()


# ── ApprovalController endpoints ────────────────────────────────────


@router.get("/app/entity/approval/workable")
async def get_workable(
    record_id: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get available approval definitions for a record."""
    data = approval_service.get_workable_approvals(db, record_id, current_user.user_id)
    return {"ok": True, "data": data}


@router.get("/app/entity/approval/alist")
async def get_approval_list(
    entity: str = Query(...),
    valid_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get approval list for an entity."""
    data = approval_service.get_approval_list(db, entity, valid_only)
    return {"ok": True, "data": data}


@router.get("/app/entity/approval/state")
async def get_approval_state(
    record_id: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the approval state of a record."""
    data = approval_service.get_approval_state(db, record_id, current_user.user_id)
    return {"ok": True, "data": data}


@router.get("/app/entity/approval/fetch-nextstep")
async def fetch_next_step(
    record_id: str = Query(...),
    approval_id: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetch next step info for submission."""
    data = approval_service.fetch_next_step(db, record_id, approval_id, current_user.user_id)
    return {"ok": True, "data": data}


@router.get("/app/entity/approval/fetch-workedsteps")
async def fetch_worked_steps(
    record_id: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetch completed steps for a record."""
    data = approval_service.fetch_worked_steps(db, record_id)
    return {"ok": True, "data": data}


@router.get("/app/entity/approval/fetch-backsteps")
async def fetch_back_steps(
    record_id: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetch steps that can be returned to."""
    data = approval_service.fetch_back_steps(db, record_id)
    return {"ok": True, "data": data}


@router.post("/app/entity/approval/submit")
async def do_submit(
    body: ApprovalSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submit a record for approval."""
    result = approval_service.do_submit(db, body.record_id, body.approval_id, current_user.user_id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return {"ok": True, "data": result}


@router.post("/app/entity/approval/approve")
async def do_approve(
    body: ApprovalApproveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Approve a step."""
    result = approval_service.do_approve(db, body.step_id, current_user.user_id, body.remark)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return {"ok": True, "data": result}


@router.post("/app/entity/approval/reject")
async def do_reject(
    body: ApprovalApproveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reject an approval step."""
    result = approval_service.do_reject(db, body.step_id, current_user.user_id, body.remark)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return {"ok": True, "data": result}


@router.post("/app/entity/approval/cancel")
async def do_cancel(
    body: ApprovalCancelRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cancel an approval."""
    result = approval_service.do_cancel(db, body.record_id, current_user.user_id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return {"ok": True, "data": result}


@router.post("/app/entity/approval/urge")
async def do_urge(
    body: ApprovalUrgeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Urge an approval (send reminder)."""
    result = approval_service.do_urge(db, body.record_id, current_user.user_id)
    return {"ok": True, "data": result}


@router.post("/app/entity/approval/revoke")
async def do_revoke(
    body: ApprovalRevokeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Revoke an approved approval."""
    result = approval_service.do_revoke(db, body.record_id, current_user.user_id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return {"ok": True, "data": result}


@router.post("/app/entity/approval/referral")
async def do_referral(
    body: ApprovalReferralRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Refer an approval step to another user."""
    result = approval_service.do_referral(db, body.step_id, body.to_user_id, current_user.user_id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return {"ok": True, "data": result}


@router.post("/app/entity/approval/countersign")
async def do_countersign(
    body: ApprovalCountersignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a countersign opinion."""
    result = approval_service.do_countersign(db, body.step_id, current_user.user_id, body.remark)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return {"ok": True, "data": result}


@router.get("/app/entity/approval/flow-definition")
async def get_flow_definition(
    approval_id: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get approval flow definition."""
    data = approval_service.get_flow_definition(db, approval_id)
    if not data:
        raise HTTPException(status_code=404, detail="Approval not found")
    return {"ok": True, "data": data}


@router.get("/app/entity/approval/view/{id}")
async def page_view(
    id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Render approval view page."""
    data = approval_service.get_approval_state(db, id, current_user.user_id)
    return templates.TemplateResponse(request, "entity/approval/approval-view.html", {
        "user": current_user,
        "record_id": id,
        "approval": data,
    })


# NOTE: Admin approval page routes (/admin/robot/approvals, /admin/robot/approval/{id})
# are defined in admin_robot.py as template-rendering routes.
