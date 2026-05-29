"""Contact routes — contacts page + user search API."""
from fastapi import APIRouter, Depends, Request, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.deps import get_current_user
from app.models import User, Department
from app.template_deps import templates
from app.core import search_users, get_user_teams

router = APIRouter()


# ══════════════════════════════════════════════════════════════════════
# Template-rendering routes
# ══════════════════════════════════════════════════════════════════════


@router.get("/contacts/home")
async def contacts_home(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Render contacts page."""
    return templates.TemplateResponse(request, "contacts/home.html", {
        "user": current_user,
    })


# ══════════════════════════════════════════════════════════════════════
# API endpoints — Contact/User Search
# Migrated from UsersGetting.java
# ══════════════════════════════════════════════════════════════════════


@router.get("/contacts/search")
async def api_contacts_search(
    q: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Search contacts (users, departments).

    Migrated from UsersGetting.users.
    """
    results = search_users(db, q)
    return {"error_code": 0, "data": results}


@router.get("/contacts/departments")
async def api_contacts_departments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get department tree for contacts.

    Migrated from UsersGetting.
    """
    depts = db.query(Department).filter(Department.is_disabled == False).all()
    result = []
    for d in depts:
        result.append({
            "id": str(d.id),
            "name": d.name,
            "parentId": str(d.parent_id) if d.parent_id else None,
        })
    return {"error_code": 0, "data": result}


@router.get("/contacts/user-info")
async def api_contacts_user_info(
    user: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get detailed user info for contacts.

    Migrated from UsersGetting.
    """
    u = db.query(User).filter(User.id == user).first()
    if not u:
        return {"error_code": 404, "error_msg": "User not found"}

    teams = get_user_teams(db, user)
    dept = None
    if u.dept_id:
        d = db.query(Department).filter(Department.id == u.dept_id).first()
        if d:
            dept = {"id": str(d.id), "name": d.name}

    return {
        "error_code": 0,
        "data": {
            "id": str(u.id),
            "fullName": u.full_name,
            "loginName": u.login_name,
            "email": u.email,
            "department": dept,
            "teams": teams,
            "isDisabled": u.is_disabled,
        },
    }
