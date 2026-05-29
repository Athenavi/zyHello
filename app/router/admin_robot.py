"""Admin robot routes — transform, approval, trigger management with APIs."""
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import User
from app.template_deps import templates
from app.services import approval_service, trigger_service

router = APIRouter()


# ---------------------------------------------------------------------------
# Page routes — transforms
# ---------------------------------------------------------------------------

@router.get("/admin/robot/transforms")
async def transform_list(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Render transform list page."""
    return templates.TemplateResponse(request, "admin/robot/transform-list.html", {
        "user": current_user,
    })


@router.get("/admin/robot/transform/{id}")
async def transform_design(
    id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Render transform design page."""
    return templates.TemplateResponse(request, "admin/robot/transform-design.html", {
        "user": current_user,
        "transformId": id,
    })


# ---------------------------------------------------------------------------
# Page routes — approvals
# ---------------------------------------------------------------------------

@router.get("/admin/robot/approvals")
async def approval_list(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Render approval list page (admin)."""
    return templates.TemplateResponse(request, "admin/robot/approval-list.html", {
        "user": current_user,
    })


@router.get("/admin/robot/approval/{id}")
async def approval_design(
    id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Render approval design page."""
    return templates.TemplateResponse(request, "admin/robot/approval-design.html", {
        "user": current_user,
        "approvalId": id,
    })


# ---------------------------------------------------------------------------
# API endpoints — approval admin (trigger page routes are in trigger.py)
# ---------------------------------------------------------------------------

@router.get("/admin/robot/approval/list")
async def api_approval_list(
    entity: str = None,
    valid_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List approval configurations, optionally filtered by entity."""
    data = approval_service.get_approval_list(db, entity, valid_only)
    return {"error_code": 0, "data": data}


@router.get("/admin/robot/approval/user-fields")
async def api_approval_user_fields(
    entity: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get user-reference fields for an entity (for approval steps)."""
    if not entity:
        return {"error_code": 400, "error_msg": "缺少实体名"}
    from app.core.metadata import get_entity, list_fields
    ent = get_entity(entity)
    if not ent:
        return {"error_code": 400, "error_msg": f"实体不存在: {entity}"}

    fields = list_fields(db, entity)
    user_fields = []
    for f in fields:
        ftype = f.field_type or ""
        fname = f.field_name or ""
        if ftype in ("REFERENCE",) and fname not in ("createdBy", "modifiedBy", "owningUser", "owningDept"):
            user_fields.append({"name": fname, "label": f.field_label or fname})
    # Always include owningUser
    user_fields.append({"name": "owningUser", "label": "所属用户"})
    return {"error_code": 0, "data": user_fields}


@router.post("/admin/robot/approval/copy")
async def api_approval_copy(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Copy an approval configuration."""
    body = await request.json()
    source_id = body.get("approvalId", "")
    if not source_id:
        return {"error_code": 400, "error_msg": "缺少审批ID"}

    from app.models import RobotApprovalConfig
    source = db.query(RobotApprovalConfig).filter(
        RobotApprovalConfig.config_id == source_id
    ).first()
    if not source:
        return {"error_code": 400, "error_msg": "审批不存在"}

    import uuid
    new_id = uuid.uuid4().hex[:20]
    new_config = RobotApprovalConfig(
        config_id=new_id,
        belong_entity=source.belong_entity,
        name=f"{source.name} (副本)",
        flow_definition=source.flow_definition,
        is_disabled=True,
    )
    db.add(new_config)
    db.commit()
    return {"error_code": 0, "data": new_id}


@router.post("/admin/robot/approval/use-stats")
async def api_approval_use_stats(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get approval usage statistics."""
    from app.models import ApprovalStatus
    from sqlalchemy import func
    stats = db.query(
        ApprovalStatus.approval_id,
        func.count(ApprovalStatus.id)
    ).group_by(ApprovalStatus.approval_id).all()
    data = {s[0]: s[1] for s in stats}
    return {"error_code": 0, "data": data}


# ---------------------------------------------------------------------------
# API endpoints — trigger admin
# (available-actions, available-entities, trigger/list are in trigger.py)
# ---------------------------------------------------------------------------

@router.get("/admin/robot/trigger/{id}/data")
async def api_trigger_get(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a single trigger configuration."""
    data = trigger_service.get_trigger(db, id)
    if not data:
        return {"error_code": 400, "error_msg": "触发器不存在"}
    return {"error_code": 0, "data": data}


@router.post("/admin/robot/trigger/save")
async def api_trigger_save(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create or update a trigger configuration."""
    body = await request.json()
    from app.models import RobotTriggerConfig
    import uuid

    config_id = body.get("configId")
    if config_id:
        cfg = db.query(RobotTriggerConfig).filter(
            RobotTriggerConfig.config_id == config_id
        ).first()
        if cfg:
            cfg.belong_entity = body.get("belongEntity", cfg.belong_entity)
            cfg.action_type = body.get("actionType", cfg.action_type)
            cfg.when_type = body.get("whenType", cfg.when_type)
            cfg.when_timer = body.get("whenTimer", cfg.when_timer)
            cfg.when_filter = body.get("whenFilter", cfg.when_filter)
            cfg.action_content = body.get("actionContent", cfg.action_content)
            cfg.is_disabled = body.get("isDisabled", cfg.is_disabled)
            db.commit()
            return {"error_code": 0, "data": config_id}
        # If not found, fall through to create

    new_id = uuid.uuid4().hex[:20]
    cfg = RobotTriggerConfig(
        config_id=new_id,
        belong_entity=body.get("belongEntity", ""),
        action_type=body.get("actionType", 0),
        when_type=body.get("whenType", 0),
        when_timer=body.get("whenTimer"),
        when_filter=body.get("whenFilter"),
        action_content=body.get("actionContent"),
        is_disabled=body.get("isDisabled", False),
    )
    db.add(cfg)
    db.commit()
    return {"error_code": 0, "data": new_id}


@router.post("/admin/robot/trigger/delete")
async def api_trigger_delete(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a trigger configuration."""
    body = await request.json()
    config_id = body.get("configId", "")
    if not config_id:
        return {"error_code": 400, "error_msg": "缺少触发器ID"}

    from app.models import RobotTriggerConfig
    cfg = db.query(RobotTriggerConfig).filter(
        RobotTriggerConfig.config_id == config_id
    ).first()
    if not cfg:
        return {"error_code": 400, "error_msg": "触发器不存在"}
    db.delete(cfg)
    db.commit()
    return {"error_code": 0, "data": {"deleted": True}}
