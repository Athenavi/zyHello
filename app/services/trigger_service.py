"""Robot trigger service — manage trigger configurations."""
import uuid
from typing import Optional

from sqlalchemy.orm import Session

from app.models import RobotTriggerConfig


def list_triggers(db: Session, entity: str = None, search: str = None) -> list[dict]:
    """List trigger configurations."""
    query = db.query(RobotTriggerConfig)
    if entity:
        query = query.filter(RobotTriggerConfig.belong_entity == entity)
    if search:
        query = query.filter(RobotTriggerConfig.name.ilike(f"%{search}%"))

    triggers = query.order_by(RobotTriggerConfig.modified_on.desc()).all()
    return [
        {
            "id": t.config_id,
            "configId": t.config_id,
            "belongEntity": t.belong_entity,
            "name": t.name,
            "actionType": t.action_type,
            "when": t.when,
            "whenFilter": t.when_filter,
            "whenTimer": t.when_timer,
            "actionContent": t.action_content,
            "priority": t.priority,
            "isDisabled": t.is_disabled,
            "modifiedOn": t.modified_on.isoformat() if t.modified_on else None,
            "createdOn": t.created_on.isoformat() if t.created_on else None,
        }
        for t in triggers
    ]


def get_trigger(db: Session, config_id: str) -> Optional[dict]:
    """Get a trigger configuration."""
    t = db.query(RobotTriggerConfig).filter(RobotTriggerConfig.config_id == config_id).first()
    if not t:
        return None
    return {
        "configId": t.config_id,
        "belongEntity": t.belong_entity,
        "name": t.name,
        "actionType": t.action_type,
        "when": t.when,
        "whenFilter": t.when_filter,
        "whenTimer": t.when_timer,
        "actionContent": t.action_content,
        "priority": t.priority,
        "isDisabled": t.is_disabled,
        "modifiedOn": t.modified_on.isoformat() if t.modified_on else None,
        "createdOn": t.created_on.isoformat() if t.created_on else None,
    }


def get_available_actions() -> list[dict]:
    """Get available trigger action types."""
    return [
        {"type": "SENDNOTIFICATION", "label": "Send Notification"},
        {"type": "FIELDAGGREGATION", "label": "Field Aggregation"},
        {"type": "FIELDWRITEBACK", "label": "Field Writeback"},
        {"type": "GROUPAGGREGATION", "label": "Group Aggregation"},
        {"type": "AUTOASSIGN", "label": "Auto Assign"},
        {"type": "AUTOSHARE", "label": "Auto Share"},
    ]


def get_available_entities(db: Session, action_type: str) -> list[dict]:
    """Get entities available for a trigger action type."""
    # In production: filter by entity metadata capabilities
    return [
        {"entity": "User", "label": "User"},
        {"entity": "Account", "label": "Account"},
        {"entity": "Contact", "label": "Contact"},
        {"entity": "Lead", "label": "Lead"},
        {"entity": "Opportunity", "label": "Opportunity"},
    ]
