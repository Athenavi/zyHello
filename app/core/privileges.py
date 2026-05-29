"""Privileges and RBAC management — user permissions, role checks.

Migrated from Java: com.rebuild.core.privileges.*
Provides role-based access control for entities, records, and operations.
"""
from __future__ import annotations

import json
import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from enum import IntEnum

from sqlalchemy import Column, String, Integer, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.orm import Session, relationship

from app.models import Base, User

log = logging.getLogger(__name__)


# ── SQLAlchemy models for RBAC ───────────────────────────────────────────────


class Role(Base):
    """Role definition."""
    __tablename__ = "role"

    role_id = Column(String(20), primary_key=True)
    name = Column(String(100), nullable=False)
    is_disabled = Column(Boolean, default=False)
    created_on = Column(DateTime, default=datetime.utcnow)
    modified_on = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class RolePrivilege(Base):
    """Per-entity permission definitions for a role."""
    __tablename__ = "role_privilege"

    id = Column(Integer, primary_key=True, autoincrement=True)
    role_id = Column(String(20), ForeignKey("role.role_id"), nullable=False, index=True)
    entity = Column(String(100), nullable=False)
    definition = Column(Text)  # JSON: {"C": true, "R": true, "U": true, "D": false, ...}


class Team(Base):
    """Team (user group) definition."""
    __tablename__ = "team"

    team_id = Column(String(20), primary_key=True)
    name = Column(String(100), nullable=False)
    principal_id = Column(String(20))  # team lead user id
    is_disabled = Column(Boolean, default=False)
    created_on = Column(DateTime, default=datetime.utcnow)


class TeamMember(Base):
    """Team membership."""
    __tablename__ = "team_member"

    id = Column(Integer, primary_key=True, autoincrement=True)
    team_id = Column(String(20), ForeignKey("team.team_id"), nullable=False, index=True)
    user_id = Column(String(20), ForeignKey("user.user_id"), nullable=False, index=True)


# ── Permission enums ─────────────────────────────────────────────────────────


class Permission(IntEnum):
    CREATE = 1
    READ = 2
    UPDATE = 4
    DELETE = 8
    ASSIGN = 16
    SHARE = 32
    UNSHARE = 64
    ALL = 127


# ── Permission checking ──────────────────────────────────────────────────────

def _generate_id() -> str:
    return uuid.uuid4().hex[:20]


def is_admin(db: Session, user_id: str) -> bool:
    """Check if user is an admin (system admin or role admin)."""
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        return False
    # System admin check - user with specific role or login_name
    if user.login_name in ("admin", "system"):
        return True
    role = db.query(Role).filter(Role.role_id == user.role_id).first()
    if role and role.name in ("Admin", "超级管理员"):
        return True
    return False


def allow(db: Session, user_id: str, entity: str, permission: Permission) -> bool:
    """Check if user has a specific permission on an entity."""
    if is_admin(db, user_id):
        return True

    user = db.query(User).filter(User.user_id == user_id).first()
    if not user or not user.role_id:
        return False

    rp = db.query(RolePrivilege).filter(
        RolePrivilege.role_id == user.role_id,
        RolePrivilege.entity == entity,
    ).first()

    if not rp or not rp.definition:
        return False

    try:
        perms = json.loads(rp.definition)
    except Exception:
        return False

    # Map permission enum to key
    perm_map = {
        Permission.CREATE: "C",
        Permission.READ: "R",
        Permission.UPDATE: "U",
        Permission.DELETE: "D",
        Permission.ASSIGN: "A",
        Permission.SHARE: "S",
    }
    key = perm_map.get(permission)
    if key and key in perms:
        return bool(perms[key])

    return False


def allow_record(db: Session, user_id: str, record_owner: str, entity: str, permission: Permission) -> bool:
    """Check record-level permission (entity perm + record ownership/team)."""
    if is_admin(db, user_id):
        return True
    # Owner always has full permissions
    if record_owner == user_id:
        return True
    # Check entity-level permission
    return allow(db, user_id, entity, permission)


# ── Role CRUD ────────────────────────────────────────────────────────────────


def create_role(db: Session, name: str) -> Role:
    role = Role(role_id=_generate_id(), name=name)
    db.add(role)
    db.commit()
    db.refresh(role)
    return role


def update_role(db: Session, role_id: str, name: str = None, is_disabled: bool = None) -> Role | None:
    role = db.query(Role).filter(Role.role_id == role_id).first()
    if not role:
        return None
    if name is not None:
        role.name = name
    if is_disabled is not None:
        role.is_disabled = is_disabled
    db.commit()
    db.refresh(role)
    return role


def delete_role(db: Session, role_id: str) -> bool:
    role = db.query(Role).filter(Role.role_id == role_id).first()
    if not role:
        return False
    role.is_disabled = True
    db.commit()
    return True


def list_roles(db: Session) -> list[dict]:
    roles = db.query(Role).filter(Role.is_disabled == False).order_by(Role.name).all()
    return [{"role_id": r.role_id, "name": r.name} for r in roles]


def get_role_privileges(db: Session, role_id: str) -> list[dict]:
    rps = db.query(RolePrivilege).filter(RolePrivilege.role_id == role_id).all()
    return [
        {"entity": rp.entity, "definition": json.loads(rp.definition) if rp.definition else {}}
        for rp in rps
    ]


def set_role_privileges(db: Session, role_id: str, entity: str, definition: dict) -> RolePrivilege:
    rp = db.query(RolePrivilege).filter(
        RolePrivilege.role_id == role_id,
        RolePrivilege.entity == entity,
    ).first()
    if rp:
        rp.definition = json.dumps(definition)
    else:
        rp = RolePrivilege(
            role_id=role_id,
            entity=entity,
            definition=json.dumps(definition),
        )
        db.add(rp)
    db.commit()
    db.refresh(rp)
    return rp


# ── Team CRUD ────────────────────────────────────────────────────────────────


def create_team(db: Session, name: str, principal_id: str = None) -> Team:
    team = Team(team_id=_generate_id(), name=name, principal_id=principal_id)
    db.add(team)
    db.commit()
    db.refresh(team)
    return team


def update_team(db: Session, team_id: str, **kwargs) -> Team | None:
    team = db.query(Team).filter(Team.team_id == team_id).first()
    if not team:
        return None
    for k, v in kwargs.items():
        if hasattr(team, k) and v is not None:
            setattr(team, k, v)
    db.commit()
    db.refresh(team)
    return team


def delete_team(db: Session, team_id: str) -> bool:
    team = db.query(Team).filter(Team.team_id == team_id).first()
    if not team:
        return False
    team.is_disabled = True
    db.commit()
    return True


def list_teams(db: Session) -> list[dict]:
    teams = db.query(Team).filter(Team.is_disabled == False).order_by(Team.name).all()
    return [{"team_id": t.team_id, "name": t.name, "principal_id": t.principal_id} for t in teams]


def add_team_member(db: Session, team_id: str, user_id: str) -> bool:
    existing = db.query(TeamMember).filter(
        TeamMember.team_id == team_id, TeamMember.user_id == user_id
    ).first()
    if existing:
        return False
    db.add(TeamMember(team_id=team_id, user_id=user_id))
    db.commit()
    return True


def remove_team_member(db: Session, team_id: str, user_id: str) -> bool:
    count = db.query(TeamMember).filter(
        TeamMember.team_id == team_id, TeamMember.user_id == user_id
    ).delete()
    db.commit()
    return count > 0


def get_team_members(db: Session, team_id: str) -> list[dict]:
    members = db.query(TeamMember).filter(TeamMember.team_id == team_id).all()
    user_ids = [m.user_id for m in members]
    users = db.query(User).filter(User.user_id.in_(user_ids)).all() if user_ids else []
    return [{"user_id": u.user_id, "full_name": u.full_name, "login_name": u.login_name} for u in users]


def get_user_teams(db: Session, user_id: str) -> list[dict]:
    memberships = db.query(TeamMember).filter(TeamMember.user_id == user_id).all()
    team_ids = [m.team_id for m in memberships]
    teams = db.query(Team).filter(Team.team_id.in_(team_ids)).all() if team_ids else []
    return [{"team_id": t.team_id, "name": t.name} for t in teams]


# ── User search helpers ──────────────────────────────────────────────────────


def search_users(db: Session, q: str = None, dept_id: str = None, role_id: str = None,
                 active_only: bool = True, limit: int = 50) -> list[dict]:
    """Search users with optional filters. Migrated from UsersGetting.java."""
    query = db.query(User)
    if active_only:
        query = query.filter(User.is_active == True, User.is_disabled == False)
    if q:
        query = query.filter(
            (User.full_name.ilike(f"%{q}%")) | (User.login_name.ilike(f"%{q}%"))
        )
    if dept_id:
        query = query.filter(User.dept_id == dept_id)
    if role_id:
        query = query.filter(User.role_id == role_id)

    users = query.limit(limit).all()
    return [
        {
            "user_id": u.user_id,
            "login_name": u.login_name,
            "full_name": u.full_name,
            "email": u.email,
            "dept_id": u.dept_id,
            "role_id": u.role_id,
            "is_active": u.is_active,
        }
        for u in users
    ]
