"""Configuration management — forms, lists, dashboards, navigation.

Migrated from Java: com.rebuild.core.configuration.*
Manages layout configurations for forms, list views, navigation, and dashboards.
"""
from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import Column, String, Integer, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.orm import Session

from app.models import Base

log = logging.getLogger(__name__)


# ── SQLAlchemy models ────────────────────────────────────────────────────────


class FormConfig(Base):
    """Form layout configuration."""
    __tablename__ = "form_config"

    config_id = Column(String(20), primary_key=True)
    belong_entity = Column(String(100), nullable=False, index=True)
    share_to = Column(String(50), default="SELF")  # SELF / ALL / specific role
    config = Column(Text)  # JSON: list of field layout items
    created_by = Column(String(20))
    created_on = Column(DateTime, default=datetime.utcnow)
    modified_on = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_disabled = Column(Boolean, default=False)


class ListConfig(Base):
    """List view configuration (columns, filters, sort)."""
    __tablename__ = "list_config"

    config_id = Column(String(20), primary_key=True)
    belong_entity = Column(String(100), nullable=False, index=True)
    config_name = Column(String(100))
    share_to = Column(String(50), default="SELF")
    config = Column(Text)  # JSON: field list, sort, filters
    created_by = Column(String(20))
    created_on = Column(DateTime, default=datetime.utcnow)
    modified_on = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_disabled = Column(Boolean, default=False)


class ViewConfig(Base):
    """Record view layout configuration."""
    __tablename__ = "view_config"

    config_id = Column(String(20), primary_key=True)
    belong_entity = Column(String(100), nullable=False, index=True)
    share_to = Column(String(50), default="SELF")
    config = Column(Text)  # JSON
    created_by = Column(String(20))
    created_on = Column(DateTime, default=datetime.utcnow)
    modified_on = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class NavConfig(Base):
    """Navigation menu configuration."""
    __tablename__ = "nav_config"

    config_id = Column(String(20), primary_key=True)
    name = Column(String(100))
    share_to = Column(String(50), default="SELF")
    config = Column(Text)  # JSON: nav items
    is_disabled = Column(Boolean, default=False)
    created_by = Column(String(20))
    created_on = Column(DateTime, default=datetime.utcnow)


# ── Helpers ──────────────────────────────────────────────────────────────────

def _generate_id() -> str:
    return uuid.uuid4().hex[:20]


def _parse_config(config_str: str) -> Any:
    if not config_str:
        return None
    try:
        return json.loads(config_str)
    except Exception:
        return None


# ── Form Configuration ───────────────────────────────────────────────────────


def get_form_layout(db: Session, entity_name: str, user_id: str = None) -> dict | None:
    """Get form layout for an entity.
    
    Migrated from FormsBuilder.buildFormLayout / FormsManager.getFormLayout.
    """
    # First try user-specific, then shared
    query = db.query(FormConfig).filter(
        FormConfig.belong_entity == entity_name,
        FormConfig.is_disabled == False,
    ).order_by(FormConfig.modified_on.desc())

    config = query.first()
    if not config:
        return None

    return {
        "config_id": config.config_id,
        "entity": entity_name,
        "share_to": config.share_to,
        "layout": _parse_config(config.config),
    }


def save_form_layout(db: Session, entity_name: str, layout: list, user_id: str = None,
                     share_to: str = "ALL") -> dict:
    """Save form layout configuration."""
    # Find existing
    existing = db.query(FormConfig).filter(
        FormConfig.belong_entity == entity_name,
        FormConfig.share_to == share_to,
    ).first()

    if existing:
        existing.config = json.dumps(layout, ensure_ascii=False)
        existing.modified_on = datetime.utcnow()
        db.commit()
        return {"config_id": existing.config_id}

    fc = FormConfig(
        config_id=_generate_id(),
        belong_entity=entity_name,
        share_to=share_to,
        config=json.dumps(layout, ensure_ascii=False),
        created_by=user_id,
    )
    db.add(fc)
    db.commit()
    return {"config_id": fc.config_id}


# ── List Configuration ───────────────────────────────────────────────────────


def get_list_fields(db: Session, entity_name: str, user_id: str = None,
                    config_type: str = None) -> dict | None:
    """Get list view configuration.
    
    Migrated from DataListManager.getListFields.
    """
    query = db.query(ListConfig).filter(
        ListConfig.belong_entity == entity_name,
        ListConfig.is_disabled == False,
    )
    if user_id:
        query = query.filter(
            (ListConfig.created_by == user_id) | (ListConfig.share_to == "ALL")
        )
    config = query.order_by(ListConfig.modified_on.desc()).first()
    if not config:
        return None
    return {
        "config_id": config.config_id,
        "entity": entity_name,
        "config_name": config.config_name,
        "fields": _parse_config(config.config),
    }


def save_list_config(db: Session, entity_name: str, config_name: str,
                     fields: list, user_id: str = None, share_to: str = "SELF") -> dict:
    """Save list view configuration."""
    lc = ListConfig(
        config_id=_generate_id(),
        belong_entity=entity_name,
        config_name=config_name,
        share_to=share_to,
        config=json.dumps(fields, ensure_ascii=False),
        created_by=user_id,
    )
    db.add(lc)
    db.commit()
    return {"config_id": lc.config_id}


# ── View Configuration ───────────────────────────────────────────────────────


def get_view_config(db: Session, entity_name: str, user_id: str = None) -> dict | None:
    """Get view layout configuration."""
    query = db.query(ViewConfig).filter(ViewConfig.belong_entity == entity_name)
    if user_id:
        query = query.filter(
            (ViewConfig.created_by == user_id) | (ViewConfig.share_to == "ALL")
        )
    config = query.order_by(ViewConfig.modified_on.desc()).first()
    if not config:
        return None
    return {
        "config_id": config.config_id,
        "entity": entity_name,
        "layout": _parse_config(config.config),
    }


def save_view_config(db: Session, entity_name: str, layout: list,
                     user_id: str = None, share_to: str = "ALL") -> dict:
    """Save view layout configuration."""
    vc = ViewConfig(
        config_id=_generate_id(),
        belong_entity=entity_name,
        share_to=share_to,
        config=json.dumps(layout, ensure_ascii=False),
        created_by=user_id,
    )
    db.add(vc)
    db.commit()
    return {"config_id": vc.config_id}


# ── Navigation Configuration ─────────────────────────────────────────────────


def get_nav_config(db: Session, user_id: str = None) -> list[dict]:
    """Get navigation menu items."""
    query = db.query(NavConfig).filter(NavConfig.is_disabled == False)
    configs = query.order_by(NavConfig.created_on).all()
    return [
        {
            "config_id": c.config_id,
            "name": c.name,
            "items": _parse_config(c.config),
        }
        for c in configs
    ]


def save_nav_config(db: Session, name: str, items: list, user_id: str = None) -> dict:
    """Save navigation configuration."""
    nc = NavConfig(
        config_id=_generate_id(),
        name=name,
        share_to="ALL",
        config=json.dumps(items, ensure_ascii=False),
        created_by=user_id,
    )
    db.add(nc)
    db.commit()
    return {"config_id": nc.config_id}
