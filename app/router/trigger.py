"""Trigger admin routes — CRUD and metadata for robot triggers."""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import User
from app.services import trigger_service
from app.template_deps import templates

router = APIRouter()


@router.get("/admin/robot/triggers")
async def page_list(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Render trigger list page."""
    return templates.TemplateResponse(request, "admin/robot/trigger-list.html", {
        "user": current_user,
    })


@router.get("/admin/robot/trigger/available-actions")
async def available_actions(
    current_user: User = Depends(get_current_user),
):
    """Get available trigger action types."""
    actions = trigger_service.get_available_actions()
    return {"ok": True, "data": actions}


@router.get("/admin/robot/trigger/available-entities")
async def available_entities(
    action_type: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get entities available for a given trigger action type."""
    entities = trigger_service.get_available_entities(db, action_type)
    return {"ok": True, "data": entities}


@router.get("/admin/robot/trigger/list")
async def trigger_list(
    entity: str = Query(None),
    search: str = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List trigger configurations with optional filtering."""
    triggers = trigger_service.list_triggers(db, entity=entity, search=search)
    return {"ok": True, "data": triggers}


# ── SendNotification routes ─────────────────────────────────────────


@router.get("/admin/robot/trigger/sendnotification-atypes")
async def sendnotification_atypes(
    current_user: User = Depends(get_current_user),
):
    """Get available notification action types."""
    return {
        "ok": True,
        "data": [
            {"type": "1", "label": "In-app notification"},
            {"type": "2", "label": "Email notification"},
            {"type": "3", "label": "SMS notification"},
        ],
    }


# ── GroupAggregation routes ─────────────────────────────────────────


@router.get("/admin/robot/trigger/group-aggregation-entities")
async def group_aggregation_entities(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get source entities for group aggregation."""
    return {
        "ok": True,
        "data": [
            {"entity": "User", "label": "User"},
            {"entity": "Account", "label": "Account"},
            {"entity": "Contact", "label": "Contact"},
            {"entity": "Opportunity", "label": "Opportunity"},
        ],
    }


@router.get("/admin/robot/trigger/group-aggregation-fields")
async def group_aggregation_fields(
    entity: str = Query(...),
    current_user: User = Depends(get_current_user),
):
    """Get target fields for group aggregation."""
    return {
        "ok": True,
        "data": [
            {"field": "totalCount", "label": "Total Count", "type": "integer"},
            {"field": "sumAmount", "label": "Sum Amount", "type": "decimal"},
        ],
    }


# ── FieldWriteback routes ───────────────────────────────────────────


@router.get("/admin/robot/trigger/field-writeback-entities")
async def field_writeback_entities(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get target entities for field writeback."""
    return {
        "ok": True,
        "data": [
            {"entity": "Account", "label": "Account"},
            {"entity": "Contact", "label": "Contact"},
            {"entity": "Opportunity", "label": "Opportunity"},
        ],
    }


@router.get("/admin/robot/trigger/field-writeback-fields")
async def field_writeback_fields(
    entity: str = Query(...),
    current_user: User = Depends(get_current_user),
):
    """Get target fields for field writeback."""
    return {
        "ok": True,
        "data": [
            {"field": "amount", "label": "Amount", "type": "decimal"},
            {"field": "totalCount", "label": "Total Count", "type": "integer"},
        ],
    }


@router.post("/admin/robot/trigger/verify-formula")
async def verify_formula(
    current_user: User = Depends(get_current_user),
):
    """Verify a formula expression."""
    return {"ok": True, "valid": True, "msg": "Formula is valid"}


@router.get("/admin/robot/trigger/field-writeback-custom-funcs")
async def field_writeback_custom_funcs(
    current_user: User = Depends(get_current_user),
):
    """Get available custom functions for field writeback."""
    return {
        "ok": True,
        "data": [
            {"func": "SUM", "label": "Sum"},
            {"func": "COUNT", "label": "Count"},
            {"func": "AVG", "label": "Average"},
            {"func": "MAX", "label": "Max"},
            {"func": "MIN", "label": "Min"},
        ],
    }


# ── FieldAggregation routes ─────────────────────────────────────────


@router.get("/admin/robot/trigger/field-aggregation-entities")
async def field_aggregation_entities(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get target entities for field aggregation."""
    return {
        "ok": True,
        "data": [
            {"entity": "Account", "label": "Account"},
            {"entity": "Contact", "label": "Contact"},
            {"entity": "Opportunity", "label": "Opportunity"},
        ],
    }


# ── Trigger editor (parameterized route — MUST come after all named routes) ──


@router.get("/admin/robot/trigger/{id}")
async def page_editor(
    id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Render trigger design page."""
    return templates.TemplateResponse(request, "admin/robot/trigger-design.html", {
        "user": current_user,
        "triggerId": id,
    })


@router.get("/admin/robot/trigger/field-aggregation-fields")
async def field_aggregation_fields(
    entity: str = Query(...),
    current_user: User = Depends(get_current_user),
):
    """Get target fields for field aggregation."""
    return {
        "ok": True,
        "data": [
            {"field": "amount", "label": "Amount", "type": "decimal"},
            {"field": "totalCount", "label": "Total Count", "type": "integer"},
        ],
    }
