"""Record CRUD service — generic entity record operations.

Migrated from Java: com.rebuild.core.service.CommonsService, GeneralEntityService,
GeneralOperatingController, CommonOperatingController.
Provides generic save/delete/get/list/find operations for any entity.
"""
from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import Column, String, Integer, Boolean, Text, DateTime, BigInteger, func
from sqlalchemy.orm import Session

from app.models import Base
from app.core.metadata import get_entity, FieldMeta

log = logging.getLogger(__name__)


# ── Generic record storage (flexible JSON-based) ─────────────────────────────
# Since entities are dynamic (user-defined), we store records in a flexible table.


class EntityRecord(Base):
    """Generic entity record storage. Each record stores its data as JSON."""
    __tablename__ = "entity_record"

    record_id = Column(String(20), primary_key=True)
    entity_name = Column(String(100), nullable=False, index=True)
    data = Column(Text, nullable=False, default="{}")  # JSON data
    owning_user = Column(String(20), index=True)
    owning_dept = Column(String(20))
    created_by = Column(String(20))
    created_on = Column(DateTime, default=datetime.utcnow)
    modified_by = Column(String(20))
    modified_on = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_deleted = Column(Boolean, default=False)


class RevisionHistory(Base):
    """Record change history."""
    __tablename__ = "revision_history"

    auto_id = Column(BigInteger, primary_key=True, autoincrement=True)
    record_id = Column(String(20), nullable=False, index=True)
    revision_type = Column(Integer, nullable=False)  # 1=create, 2=delete, 4=update, 16=assign, 32=share
    revision_on = Column(DateTime, default=datetime.utcnow)
    revision_by = Column(String(20))
    channel_with = Column(Text)  # JSON diff or extra info


class ShareAccess(Base):
    """Record sharing access."""
    __tablename__ = "share_access"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    record_id = Column(String(20), nullable=False, index=True)
    share_to = Column(String(20), nullable=False, index=True)
    rights = Column(Integer, default=2)  # bitmask: 2=read, 4=update
    created_by = Column(String(20))
    created_on = Column(DateTime, default=datetime.utcnow)


class AdvFilter(Base):
    """Advanced filter configuration."""
    __tablename__ = "adv_filter"

    filter_id = Column(String(20), primary_key=True)
    name = Column(String(200), nullable=False)
    entity = Column(String(100), nullable=False, index=True)
    filter_config = Column(Text)  # JSON
    share_to = Column(String(50))  # SELF / ALL / specific user
    created_by = Column(String(20), nullable=False)
    created_on = Column(DateTime, default=datetime.utcnow)
    modified_on = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ── Revision types ───────────────────────────────────────────────────────────

REV_CREATE = 1
REV_DELETE = 2
REV_UPDATE = 4
REV_ASSIGN = 16
REV_SHARE = 32
REV_UNSHARE = 64


# ── Helpers ──────────────────────────────────────────────────────────────────

def _generate_id() -> str:
    return uuid.uuid4().hex[:20]


def _validate_and_build_data(entity_name: str, raw_data: dict) -> dict:
    """Validate raw data against entity metadata and return cleaned data."""
    emeta = get_entity(entity_name)
    if not emeta:
        # If entity not in registry, accept raw data as-is (for built-in entities like User)
        return raw_data

    cleaned = {}
    for fname, value in raw_data.items():
        fm = emeta.get_field(fname)
        if fm is None:
            continue  # skip unknown fields
        if not fm.creatable and fname not in ("record_id",):
            continue
        # Basic type coercion
        cleaned[fname] = _coerce_value(fm, value)
    return cleaned


def _coerce_value(fm: FieldMeta, value: Any) -> Any:
    """Coerce a value to match the field type."""
    if value is None:
        return None
    ft = fm.field_type.upper()
    try:
        if ft in ("INT", "INTEGER"):
            return int(value)
        elif ft in ("DECIMAL", "NUMBER", "DOUBLE"):
            return float(value)
        elif ft in ("BOOL", "BOOLEAN"):
            if isinstance(value, str):
                return value.lower() in ("true", "1", "yes")
            return bool(value)
        elif ft in ("DATE", "DATETIME", "TIMESTAMP"):
            if isinstance(value, str):
                return value  # stored as ISO string in JSON
            return value
        else:
            return str(value)
    except (ValueError, TypeError):
        return value


def _record_to_dict(record: EntityRecord) -> dict:
    """Convert an EntityRecord to a serializable dict."""
    data = json.loads(record.data) if record.data else {}
    data["record_id"] = record.record_id
    data["entity"] = record.entity_name
    data["owningUser"] = record.owning_user
    data["createdBy"] = record.created_by
    data["createdOn"] = record.created_on.isoformat() if record.created_on else None
    data["modifiedOn"] = record.modified_on.isoformat() if record.modified_on else None
    return data


# ── CRUD Operations ──────────────────────────────────────────────────────────


def save_record(db: Session, entity_name: str, data: dict, user_id: str,
                record_id: str = None) -> dict:
    """Save (create or update) an entity record.
    
    Migrated from GeneralOperatingController.record-save and CommonOperatingController.common-save.
    """
    data = _validate_and_build_data(entity_name, data)

    if record_id:
        # UPDATE
        rec = db.query(EntityRecord).filter(
            EntityRecord.record_id == record_id,
            EntityRecord.is_deleted == False,
        ).first()
        if not rec:
            raise ValueError(f"Record not found: {record_id}")

        old_data = json.loads(rec.data) if rec.data else {}
        old_data.update(data)
        rec.data = json.dumps(old_data, ensure_ascii=False)
        rec.modified_by = user_id
        rec.modified_on = datetime.utcnow()

        # Revision history
        db.add(RevisionHistory(
            record_id=record_id,
            revision_type=REV_UPDATE,
            revision_by=user_id,
            channel_with=json.dumps({"updated": list(data.keys())}),
        ))
        db.commit()
        db.refresh(rec)
        return _record_to_dict(rec)

    else:
        # CREATE
        new_id = _generate_id()
        rec = EntityRecord(
            record_id=new_id,
            entity_name=entity_name,
            data=json.dumps(data, ensure_ascii=False),
            owning_user=data.get("owningUser", user_id),
            owning_dept=data.get("owningDept"),
            created_by=user_id,
            modified_by=user_id,
        )
        db.add(rec)

        # Revision history
        db.add(RevisionHistory(
            record_id=new_id,
            revision_type=REV_CREATE,
            revision_by=user_id,
        ))
        db.commit()
        db.refresh(rec)
        return _record_to_dict(rec)


def delete_record(db: Session, record_id: str, user_id: str = None) -> dict:
    """Soft-delete a record.
    
    Migrated from GeneralOperatingController.record-delete and CommonOperatingController.common-delete.
    """
    rec = db.query(EntityRecord).filter(
        EntityRecord.record_id == record_id,
        EntityRecord.is_deleted == False,
    ).first()
    if not rec:
        raise ValueError(f"Record not found: {record_id}")

    rec.is_deleted = True
    rec.modified_by = user_id
    rec.modified_on = datetime.utcnow()

    db.add(RevisionHistory(
        record_id=record_id,
        revision_type=REV_DELETE,
        revision_by=user_id,
    ))
    db.commit()
    return {"deleted": 1, "record_id": record_id}


def get_record(db: Session, record_id: str) -> Optional[dict]:
    """Get a single record by ID.
    
    Migrated from CommonOperatingController.common-get.
    """
    rec = db.query(EntityRecord).filter(
        EntityRecord.record_id == record_id,
        EntityRecord.is_deleted == False,
    ).first()
    if not rec:
        return None
    return _record_to_dict(rec)


def find_records(db: Session, entity_name: str, filters: dict = None,
                 order_by: str = None, limit: int = 100) -> list[dict]:
    """Find records matching filters.
    
    Migrated from CommonOperatingController.common-find.
    """
    query = db.query(EntityRecord).filter(
        EntityRecord.entity_name == entity_name,
        EntityRecord.is_deleted == False,
    )

    if filters:
        for key, value in filters.items():
            if key in ("record_id", "owning_user", "created_by"):
                query = query.filter(getattr(EntityRecord, key) == value)

    if order_by == "modifiedOn":
        query = query.order_by(EntityRecord.modified_on.desc())
    elif order_by == "createdOn":
        query = query.order_by(EntityRecord.created_on.desc())
    else:
        query = query.order_by(EntityRecord.modified_on.desc())

    records = query.limit(limit).all()
    return [_record_to_dict(r) for r in records]


def list_records(db: Session, entity_name: str, page_no: int = 1, page_size: int = 20,
                 fields: list[str] = None, filters: dict = None, user_id: str = None) -> dict:
    """List records with pagination.
    
    Migrated from CommonOperatingController.common-list and GeneralListController.data-list.
    """
    query = db.query(EntityRecord).filter(
        EntityRecord.entity_name == entity_name,
        EntityRecord.is_deleted == False,
    )

    # Apply filters
    if filters:
        for key, value in filters.items():
            if key in ("owning_user", "created_by"):
                query = query.filter(getattr(EntityRecord, key) == value)

    # Count total
    total = query.count()

    # Paginate
    offset = (page_no - 1) * page_size
    records = query.order_by(EntityRecord.modified_on.desc()).offset(offset).limit(page_size).all()

    data = [_record_to_dict(r) for r in records]

    # Filter fields if specified
    if fields:
        data = [{k: v for k, v in rec.items() if k in fields or k in ("record_id", "entity")} for rec in data]

    return {
        "total": total,
        "page_no": page_no,
        "page_size": page_size,
        "data": data,
    }


def assign_record(db: Session, record_id: str, assign_to: str, user_id: str) -> dict:
    """Assign a record to another user.
    
    Migrated from GeneralOperatingController.record-assign.
    """
    rec = db.query(EntityRecord).filter(
        EntityRecord.record_id == record_id,
        EntityRecord.is_deleted == False,
    ).first()
    if not rec:
        raise ValueError(f"Record not found: {record_id}")

    rec.owning_user = assign_to
    rec.modified_by = user_id
    rec.modified_on = datetime.utcnow()

    db.add(RevisionHistory(
        record_id=record_id,
        revision_type=REV_ASSIGN,
        revision_by=user_id,
        channel_with=json.dumps({"assignTo": assign_to}),
    ))
    db.commit()
    return {"assigned": 1, "record_id": record_id}


def share_record(db: Session, record_id: str, share_to: str, rights: int = 2,
                 user_id: str = None) -> dict:
    """Share a record with another user.
    
    Migrated from GeneralOperatingController.record-share.
    """
    # Check existing
    existing = db.query(ShareAccess).filter(
        ShareAccess.record_id == record_id,
        ShareAccess.share_to == share_to,
    ).first()
    if existing:
        existing.rights = rights
    else:
        db.add(ShareAccess(
            record_id=record_id,
            share_to=share_to,
            rights=rights,
            created_by=user_id,
        ))

    db.add(RevisionHistory(
        record_id=record_id,
        revision_type=REV_SHARE,
        revision_by=user_id,
        channel_with=json.dumps({"shareTo": share_to}),
    ))
    db.commit()
    return {"shared": 1, "record_id": record_id}


def unshare_record(db: Session, record_id: str, share_to: str, user_id: str = None) -> dict:
    """Remove sharing for a record.
    
    Migrated from GeneralOperatingController.record-unshare.
    """
    count = db.query(ShareAccess).filter(
        ShareAccess.record_id == record_id,
        ShareAccess.share_to == share_to,
    ).delete()

    if count > 0:
        db.add(RevisionHistory(
            record_id=record_id,
            revision_type=REV_UNSHARE,
            revision_by=user_id,
            channel_with=json.dumps({"unshareFrom": share_to}),
        ))
    db.commit()
    return {"unshared": count, "record_id": record_id}


def get_shared_list(db: Session, record_id: str) -> list[dict]:
    """Get list of users a record is shared with.
    
    Migrated from GeneralOperatingController.shared-list.
    """
    shares = db.query(ShareAccess).filter(ShareAccess.record_id == record_id).all()
    from app.models import User
    result = []
    for s in shares:
        user = db.query(User).filter(User.user_id == s.share_to).first()
        result.append({
            "share_to": s.share_to,
            "share_to_name": user.full_name if user else s.share_to,
            "rights": s.rights,
        })
    return result


def get_record_meta(db: Session, record_id: str) -> dict:
    """Get record metadata (created/modified info, sharing list).
    
    Migrated from ModelExtrasController.record-meta.
    """
    rec = db.query(EntityRecord).filter(EntityRecord.record_id == record_id).first()
    if not rec:
        return {}

    from app.models import User
    owner = db.query(User).filter(User.user_id == rec.owning_user).first()
    creator = db.query(User).filter(User.user_id == rec.created_by).first()
    sharing_list = get_shared_list(db, record_id)

    return {
        "createdOn": rec.created_on.isoformat() if rec.created_on else None,
        "modifiedOn": rec.modified_on.isoformat() if rec.modified_on else None,
        "owningUser": {
            "id": rec.owning_user,
            "name": owner.full_name if owner else None,
        },
        "createdBy": {
            "id": rec.created_by,
            "name": creator.full_name if creator else None,
        },
        "sharingList": sharing_list,
    }


def get_record_history(db: Session, record_id: str, limit: int = 100) -> list[dict]:
    """Get record revision history.
    
    Migrated from ModelExtrasController.record-history.
    """
    history = db.query(RevisionHistory).filter(
        RevisionHistory.record_id == record_id,
    ).order_by(RevisionHistory.auto_id.desc()).limit(limit).all()

    from app.models import User
    result = []
    for h in history:
        user = db.query(User).filter(User.user_id == h.revision_by).first()
        rev_type_map = {
            1: "Create", 2: "Delete", 4: "Update",
            16: "Assign", 32: "Share", 64: "Unshare",
        }
        result.append({
            "revisionType": rev_type_map.get(h.revision_type, f"Other ({h.revision_type})"),
            "revisionOn": h.revision_on.isoformat() if h.revision_on else None,
            "revisionBy": {
                "id": h.revision_by,
                "name": user.full_name if user else None,
            },
            "channelWith": h.channel_with,
        })
    return result


# ── Advanced Filter ──────────────────────────────────────────────────────────


def save_adv_filter(db: Session, name: str, entity: str, filter_config: dict,
                    share_to: str = "SELF", user_id: str = None, filter_id: str = None) -> dict:
    """Save or update an advanced filter.
    
    Migrated from AdvFilterController.advfilter/post.
    """
    if filter_id:
        af = db.query(AdvFilter).filter(AdvFilter.filter_id == filter_id).first()
        if af:
            af.name = name
            af.filter_config = json.dumps(filter_config, ensure_ascii=False)
            af.share_to = share_to
            af.modified_on = datetime.utcnow()
            db.commit()
            return {"filter_id": af.filter_id, "name": af.name}

    af = AdvFilter(
        filter_id=_generate_id(),
        name=name,
        entity=entity,
        filter_config=json.dumps(filter_config, ensure_ascii=False),
        share_to=share_to,
        created_by=user_id,
    )
    db.add(af)
    db.commit()
    db.refresh(af)
    return {"filter_id": af.filter_id, "name": af.name}


def get_adv_filter(db: Session, filter_id: str) -> Optional[dict]:
    """Get an advanced filter by ID.
    
    Migrated from AdvFilterController.advfilter/get.
    """
    af = db.query(AdvFilter).filter(AdvFilter.filter_id == filter_id).first()
    if not af:
        return None
    return {
        "filter_id": af.filter_id,
        "name": af.name,
        "entity": af.entity,
        "filter_config": json.loads(af.filter_config) if af.filter_config else {},
        "share_to": af.share_to,
    }


def list_adv_filters(db: Session, entity: str, user_id: str = None) -> list[dict]:
    """List advanced filters for an entity.
    
    Migrated from AdvFilterController.advfilter/list.
    """
    query = db.query(AdvFilter).filter(AdvFilter.entity == entity)
    if user_id:
        query = query.filter(
            (AdvFilter.created_by == user_id) | (AdvFilter.share_to == "ALL")
        )
    filters = query.order_by(AdvFilter.created_on.desc()).all()
    return [
        {
            "filter_id": f.filter_id,
            "name": f.name,
            "entity": f.entity,
            "share_to": f.share_to,
        }
        for f in filters
    ]


def parse_filter_to_sql(entity_name: str, filter_config: dict) -> str:
    """Parse an advanced filter config into a SQL WHERE clause.
    
    Simplified version — returns a pseudo-SQL WHERE for use in queries.
    Migrated from AdvFilterParser.toSqlWhere.
    """
    if not filter_config:
        return "1=1"

    items = filter_config.get("items", [])
    if not items:
        return "1=1"

    conditions = []
    op_map = {
        "EQ": "=", "NEQ": "!=", "GT": ">", "LT": "<", "GTE": ">=", "LTE": "<=",
        "LIKE": "LIKE", "NLL": "IS NULL", "NLN": "IS NOT NULL",
        "BETWEEN": "BETWEEN", "IN": "IN",
    }

    for item in items:
        field = item.get("field", "")
        op = item.get("op", "EQ")
        value = item.get("value")
        sql_op = op_map.get(op, "=")

        if op in ("NLL", "NLN"):
            conditions.append(f"{field} {sql_op}")
        elif op == "LIKE" and value:
            conditions.append(f"{field} LIKE '%{value}%'")
        elif op == "IN" and value:
            vals = "','".join(str(v) for v in value) if isinstance(value, list) else str(value)
            conditions.append(f"{field} IN ('{vals}')")
        elif op == "BETWEEN" and isinstance(value, list) and len(value) == 2:
            conditions.append(f"{field} BETWEEN '{value[0]}' AND '{value[1]}'")
        elif value is not None:
            conditions.append(f"{field} {sql_op} '{value}'")

    return " AND ".join(conditions) if conditions else "1=1"
