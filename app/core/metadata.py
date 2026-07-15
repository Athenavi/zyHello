"""Metadata management entity/field definitions, references, classifications.

Migrated from Java: com.rebuild.core.metadata.*
Uses SQLAlchemy models for persistent metadata storage and an in-memory registry
for runtime entity/field lookups (analogous to MetadataHelper in Java).
"""
from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import Column, String, Integer, Boolean, Text, DateTime, ForeignKey, BigInteger
from sqlalchemy.orm import relationship, Session

from app.models import Base

log = logging.getLogger(__name__)


# ── SQLAlchemy models for metadata persistence ────────────────────────────────


class MetaEntity(Base):
    """Stores entity (table) metadata definitions."""
    __tablename__ = "meta_entity"

    entity_id = Column(String(20), primary_key=True)
    entity_name = Column(String(100), unique=True, nullable=False)
    entity_label = Column(String(200), nullable=False)
    physical_name = Column(String(100))
    entity_type = Column(Integer, default=0)  # 0=normal, 1=detail, 2=slave
    parent_entity = Column(String(100))
    is_disabled = Column(Boolean, default=False)
    comments = Column(Text)
    created_on = Column(DateTime, default=datetime.utcnow)
    modified_on = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class MetaField(Base):
    """Stores field (column) metadata definitions."""
    __tablename__ = "meta_field"

    field_id = Column(String(20), primary_key=True)
    entity_name = Column(String(100), nullable=False, index=True)
    field_name = Column(String(100), nullable=False)
    field_label = Column(String(200))
    field_type = Column(String(50), nullable=False)  # TEXT, NUMBER, DATE, PICKLIST, REFERENCE, etc.
    nullable = Column(Boolean, default=True)
    updatable = Column(Boolean, default=True)
    repeatable = Column(Boolean, default=True)
    queryable = Column(Boolean, default=True)
    sortable = Column(Boolean, default=True)
    creatable = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)
    is_hidden = Column(Boolean, default=False)
    is_disabled = Column(Boolean, default=False)
    display_type = Column(String(50))
    default_value = Column(Text)
    ref_entity = Column(String(100))
    ref_field = Column(String(100))
    cascade = Column(String(20))
    comments = Column(Text)
    seq = Column(Integer, default=0)
    extra_attrs = Column(Text)  # JSON
    created_on = Column(DateTime, default=datetime.utcnow)
    modified_on = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ClassificationData(Base):
    """Classification (hierarchical picklist) data."""
    __tablename__ = "classification_data"

    item_id = Column(String(20), primary_key=True)
    data_id = Column(String(20), nullable=False, index=True)  # classification root id
    name = Column(String(200), nullable=False)
    parent_id = Column(String(20), index=True)
    code = Column(String(50))
    level = Column(Integer, default=0)
    seq = Column(Integer, default=0)
    is_hide = Column(Boolean, default=False)
    is_disabled = Column(Boolean, default=False)


class AutoFillinConfig(Base):
    """Auto fill-in configuration for reference fields."""
    __tablename__ = "auto_fillin_config"

    config_id = Column(String(20), primary_key=True)
    belong_entity = Column(String(100), nullable=False)
    belong_field = Column(String(100), nullable=False)
    source_entity = Column(String(100), nullable=False)
    target_field = Column(String(100), nullable=False)
    source_field = Column(String(100), nullable=False)
    ext_config = Column(Text)  # JSON
    created_on = Column(DateTime, default=datetime.utcnow)
    modified_on = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class PickList(Base):
    """Picklist items."""
    __tablename__ = "pick_list"

    item_id = Column(String(20), primary_key=True)
    belong_entity = Column(String(100), nullable=False, index=True)
    belong_field = Column(String(100), nullable=False, index=True)
    text = Column(String(200), nullable=False)
    seq = Column(Integer, default=0)
    is_default = Column(Boolean, default=False)
    is_hide = Column(Boolean, default=False)
    is_disabled = Column(Boolean, default=False)
    color = Column(String(20))


class MultiSelect(Base):
    """Multi-select field items."""
    __tablename__ = "multi_select"

    item_id = Column(String(20), primary_key=True)
    belong_entity = Column(String(100), nullable=False, index=True)
    belong_field = Column(String(100), nullable=False, index=True)
    text = Column(String(200), nullable=False)
    mask = Column(BigInteger, default=0)
    seq = Column(Integer, default=0)
    is_hide = Column(Boolean, default=False)
    is_disabled = Column(Boolean, default=False)
    color = Column(String(20))


# ── In-memory metadata registry ──────────────────────────────────────────────


@dataclass
class FieldMeta:
    """Runtime field metadata."""
    field_name: str
    field_label: str
    field_type: str
    nullable: bool = True
    updatable: bool = True
    creatable: bool = True
    queryable: bool = True
    is_default: bool = False
    is_hidden: bool = False
    display_type: str | None = None
    default_value: str | None = None
    ref_entity: str | None = None
    ref_field: str | None = None
    extra_attrs: dict[str, Any] = field(default_factory=dict)


@dataclass
class EntityMeta:
    """Runtime entity metadata."""
    entity_name: str
    entity_label: str
    entity_type: int = 0  # 0=normal, 1=detail, 2=slave
    physical_name: str | None = None
    parent_entity: str | None = None
    comments: str | None = None
    fields: dict[str, FieldMeta] = field(default_factory=dict)

    def get_field(self, field_name: str) -> FieldMeta | None:
        return self.fields.get(field_name)

    def get_fields(self) -> list[FieldMeta]:
        return list(self.fields.values())

    def get_reference_fields(self) -> list[FieldMeta]:
        return [f for f in self.fields.values() if f.field_type == "REFERENCE"]

    @property
    def name_field(self) -> FieldMeta | None:
        """Get the 'name' or primary display field."""
        for fname in ("name", "fullName", "loginName", "title", "taskName"):
            if fname in self.fields:
                return self.fields[fname]
        # fallback: first TEXT field
        for f in self.fields.values():
            if f.field_type == "TEXT":
                return f
        return None


# Singleton registry
_entity_registry: dict[str, EntityMeta] = {}


def _generate_id() -> str:
    return uuid.uuid4().hex[:20]


def reload_metadata(db: Session) -> None:
    """Load all entity/field definitions from DB into the in-memory registry."""
    global _entity_registry
    _entity_registry.clear()

    entities = db.query(MetaEntity).filter(MetaEntity.is_disabled == False).all()
    for ent in entities:
        em = EntityMeta(
            entity_name=ent.entity_name,
            entity_label=ent.entity_label,
            entity_type=ent.entity_type,
            physical_name=ent.physical_name,
            parent_entity=ent.parent_entity,
        )
        fields = db.query(MetaField).filter(
            MetaField.entity_name == ent.entity_name,
            MetaField.is_disabled == False,
        ).order_by(MetaField.seq).all()
        for fld in fields:
            extra = {}
            if fld.extra_attrs:
                import json
                try:
                    extra = json.loads(fld.extra_attrs)
                except Exception:
                    pass
            fm = FieldMeta(
                field_name=fld.field_name,
                field_label=fld.field_label or fld.field_name,
                field_type=fld.field_type,
                nullable=fld.nullable,
                updatable=fld.updatable,
                creatable=fld.creatable,
                queryable=fld.queryable,
                is_default=fld.is_default,
                is_hidden=fld.is_hidden,
                display_type=fld.display_type,
                default_value=fld.default_value,
                ref_entity=fld.ref_entity,
                ref_field=fld.ref_field,
                extra_attrs=extra,
            )
            em.fields[fld.field_name] = fm
        _entity_registry[ent.entity_name] = em

    _seed_bizz_entities()
    log.info("Loaded %d entities into metadata registry", len(_entity_registry))


def _seed_bizz_entities() -> None:
    """Seed built-in bizz entities (User, Department, Role, Team) into the registry.

    These entities are backed by hard-coded SQLAlchemy models, not by rows
    in the ``meta_entity`` table.  We create minimal ``EntityMeta`` objects
    so they show up in /commons/entities.
    """
    bizz_defs = {
        "User": {
            "label": "用户",
            "comments": "系统用户",
            "fields": {
                "user_id":      ("用户ID",    "TEXT", True),
                "login_name":   ("登录",    "TEXT", True),
                "full_name":    ("姓名",      "TEXT", True),
                "email":        ("邮箱",      "EMAIL", True),
                "workphone":    ("电话",      "TEXT", True),
                "is_disabled":  ("已禁",    "BOOL", False),
                "dept_id":      ("所属部",  "REFERENCE", False),
                "role_id":      ("所属角",  "REFERENCE", False),
                "created_on":   ("创建时间",  "DATETIME", False),
                "modified_on":  ("修改时间",  "DATETIME", False),
            },
        },
        "Department": {
            "label": "部门",
            "comments": "组织部门",
            "fields": {
                "dept_id":    ("部门ID",   "TEXT", True),
                "name":       ("部门名称",  "TEXT", True),
                "parent_id":  ("上级部门",  "REFERENCE", False),
                "is_disabled":("已禁",    "BOOL", False),
            },
        },
        "Role": {
            "label": "角色",
            "comments": "系统角色",
            "fields": {
                "role_id":       ("角色ID",   "TEXT", True),
                "name":          ("角色名称",  "TEXT", True),
                "is_disabled":   ("已禁",   "BOOL", False),
                "created_on":    ("创建时间",  "DATETIME", False),
            },
        },
        "Team": {
            "label": "团队",
            "comments": "用户团队",
            "fields": {
                "team_id":      ("团队ID",   "TEXT", True),
                "name":         ("团队名称",  "TEXT", True),
                "is_disabled":  ("已禁",   "BOOL", False),
                "created_on":   ("创建时间",  "DATETIME", False),
            },
        },
    }
    for ename, edef in bizz_defs.items():
        if ename in _entity_registry:
            continue  # already loaded from DB
        em = EntityMeta(
            entity_name=ename,
            entity_label=edef["label"],
            comments=edef["comments"],
            physical_name=ename.lower(),
        )
        for fname, (flabel, ftype, required) in edef["fields"].items():
            em.fields[fname] = FieldMeta(
                field_name=fname,
                field_label=flabel,
                field_type=ftype,
                nullable=not required,
                updatable=True,
                creatable=True,
                queryable=True,
            )
        _entity_registry[ename] = em


def contains_entity(entity_name: str) -> bool:
    return entity_name in _entity_registry


def get_entity(entity_name: str) -> EntityMeta | None:
    return _entity_registry.get(entity_name)


def get_entities() -> list[EntityMeta]:
    return list(_entity_registry.values())


def get_detail_entities(main_entity: str) -> list[EntityMeta]:
    """Get detail entities for a main entity."""
    return [e for e in _entity_registry.values() if e.parent_entity == main_entity and e.entity_type == 1]


def get_reference_entities(entity_name: str) -> list[dict]:
    """Get entities that reference the given entity."""
    refs = []
    for ename, emeta in _entity_registry.items():
        for fm in emeta.get_reference_fields():
            if fm.ref_entity == entity_name:
                refs.append({
                    "entity": ename,
                    "entity_label": emeta.entity_label,
                    "field": fm.field_name,
                    "field_label": fm.field_label,
                })
    return refs


def is_bizz_entity(entity_name: str) -> bool:
    """Check if entity is a business entity (User, Department, Role, Team)."""
    return entity_name in ("User", "Department", "Role", "Team")


def has_privileges_field(entity_name: str) -> bool:
    """Check if entity has owningUser (RBAC control)."""
    em = get_entity(entity_name)
    if not em:
        return False
    return "owningUser" in em.fields or "createdBy" in em.fields


# ── CRUD for metadata definitions ────────────────────────────────────────────


def create_entity(db: Session, entity_name: str, entity_label: str,
                  entity_type: int = 0, parent_entity: str = None, comments: str = None) -> MetaEntity:
    """Create a new entity definition."""
    ent = MetaEntity(
        entity_id=_generate_id(),
        entity_name=entity_name,
        entity_label=entity_label,
        physical_name=entity_name.lower(),
        entity_type=entity_type,
        parent_entity=parent_entity,
        comments=comments,
    )
    db.add(ent)
    db.commit()
    db.refresh(ent)
    return ent


def update_entity(db: Session, entity_name: str, **kwargs) -> Optional[MetaEntity]:
    """Update entity definition fields."""
    ent = db.query(MetaEntity).filter(MetaEntity.entity_name == entity_name).first()
    if not ent:
        return None
    for k, v in kwargs.items():
        if hasattr(ent, k) and v is not None:
            setattr(ent, k, v)
    db.commit()
    db.refresh(ent)
    return ent


def delete_entity(db: Session, entity_name: str) -> bool:
    """Soft-delete an entity (mark as disabled)."""
    ent = db.query(MetaEntity).filter(MetaEntity.entity_name == entity_name).first()
    if not ent:
        return False
    ent.is_disabled = True
    db.commit()
    return True


def create_field(db: Session, entity_name: str, field_name: str, field_label: str,
                 field_type: str = "TEXT", **kwargs) -> MetaField:
    """Create a new field definition."""
    fld = MetaField(
        field_id=_generate_id(),
        entity_name=entity_name,
        field_name=field_name,
        field_label=field_label,
        field_type=field_type,
        **{k: v for k, v in kwargs.items() if hasattr(MetaField, k)},
    )
    db.add(fld)
    db.commit()
    db.refresh(fld)
    return fld


def update_field(db: Session, entity_name: str, field_name: str, **kwargs) -> Optional[MetaField]:
    """Update field definition."""
    fld = db.query(MetaField).filter(
        MetaField.entity_name == entity_name,
        MetaField.field_name == field_name,
    ).first()
    if not fld:
        return None
    for k, v in kwargs.items():
        if hasattr(fld, k) and v is not None:
            setattr(fld, k, v)
    db.commit()
    db.refresh(fld)
    return fld


def delete_field(db: Session, entity_name: str, field_name: str) -> bool:
    """Soft-delete a field."""
    fld = db.query(MetaField).filter(
        MetaField.entity_name == entity_name,
        MetaField.field_name == field_name,
    ).first()
    if not fld:
        return False
    fld.is_disabled = True
    db.commit()
    return True


def list_fields(db: Session, entity_name: str, include_disabled: bool = False) -> list[MetaField]:
    """List all fields for an entity."""
    query = db.query(MetaField).filter(MetaField.entity_name == entity_name)
    if not include_disabled:
        query = query.filter(MetaField.is_disabled == False)
    return query.order_by(MetaField.seq).all()


def meta_field_to_dict(field: MetaField) -> dict:
    """Convert a MetaField ORM object to a frontend-friendly dict (camelCase keys)."""
    return {
        "field": field.field_name,
        "name": field.field_name,
        "fieldLabel": field.field_label or field.field_name,
        "label": field.field_label or field.field_name,
        "type": field.field_type,
        "displayType": field.display_type or field.field_type,
        "nullable": field.nullable,
        "creatable": field.creatable,
        "updatable": field.updatable,
        "is_hidden": field.is_hidden,
        "is_disabled": field.is_disabled,
        "is_default": field.is_default,
        "sortable": field.sortable,
        "queryable": field.queryable,
        "repeatable": field.repeatable,
        "defaultValue": field.default_value,
        "refEntity": field.ref_entity,
        "refField": field.ref_field,
        "seq": field.seq,
        "comments": field.comments,
        "extraAttrs": field.extra_attrs,
    }


def list_fields_as_dicts(db: Session, entity_name: str, include_disabled: bool = False) -> list[dict]:
    """List fields and return as frontend-friendly dict list."""
    fields = list_fields(db, entity_name, include_disabled)
    return [meta_field_to_dict(f) for f in fields]


def entity_meta_to_dict(em: EntityMeta) -> dict:
    """Convert an EntityMeta dataclass to a frontend-friendly dict (camelCase keys)."""
    return {
        "entity": em.entity_name,
        "name": em.entity_name,
        "entityLabel": em.entity_label,
        "label": em.entity_label,
        "entityType": em.entity_type,
        "physicalName": em.physical_name,
        "parentEntity": em.parent_entity,
        "comments": em.comments,
    }


def list_entities(db: Session, include_disabled: bool = False) -> list[MetaEntity]:
    """List all entities."""
    query = db.query(MetaEntity)
    if not include_disabled:
        query = query.filter(MetaEntity.is_disabled == False)
    return query.order_by(MetaEntity.entity_name).all()


def list_entity_as_dict(ent: MetaEntity) -> dict:
    """Convert a MetaEntity ORM object to a frontend-friendly dict."""
    return {
        "id": ent.entity_id,
        "name": ent.entity_name,
        "label": ent.entity_label,
        "entity": ent.entity_name,
        "entityName": ent.entity_name,
        "entityLabel": ent.entity_label,
        "entityType": ent.entity_type,
        "physicalName": ent.physical_name,
        "parentEntity": ent.parent_entity,
        "isDisabled": ent.is_disabled,
        "comments": ent.comments,
    }


def list_entities_as_dicts(db: Session, include_disabled: bool = False) -> list[dict]:
    """List entities and return as frontend-friendly dict list."""
    return [list_entity_as_dict(e) for e in list_entities(db, include_disabled)]


def get_picklist(db: Session, entity_name: str, field_name: str) -> list[dict]:
    """Get picklist items for a field."""
    items = db.query(PickList).filter(
        PickList.belong_entity == entity_name,
        PickList.belong_field == field_name,
        PickList.is_disabled == False,
    ).order_by(PickList.seq).all()
    return [
        {"id": i.item_id, "text": i.text, "is_default": i.is_default, "color": i.color}
        for i in items
    ]


def get_classification(db: Session, data_id: str, parent_id: str = None) -> list[dict]:
    """Get classification tree items."""
    query = db.query(ClassificationData).filter(
        ClassificationData.data_id == data_id,
        ClassificationData.is_disabled == False,
    )
    if parent_id:
        query = query.filter(ClassificationData.parent_id == parent_id)
    else:
        query = query.filter(ClassificationData.parent_id.is_(None))
    items = query.order_by(ClassificationData.seq).all()
    return [
        {"id": i.item_id, "name": i.name, "code": i.code, "level": i.level}
        for i in items
    ]
