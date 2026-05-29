"""Admin bizuser routes — user, department, role, team management with CRUD APIs."""
from fastapi import APIRouter, Depends, Request, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.deps import get_current_user
from app.models import User, Department
from app.template_deps import templates
from app.core import (
    is_admin,
    create_role, update_role, delete_role, list_roles,
    get_role_privileges, set_role_privileges,
    create_team, update_team, delete_team, list_teams,
    add_team_member, remove_team_member, get_team_members, get_user_teams,
    search_users,
)

router = APIRouter()


# ══════════════════════════════════════════════════════════════════════
# Template-rendering routes (page views)
# ══════════════════════════════════════════════════════════════════════


@router.get("/admin/bizuser/users")
async def user_list(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Render admin user list page."""
    return templates.TemplateResponse(request, "admin/bizuser/user-list.html", {
        "user": current_user,
    })


@router.get("/admin/bizuser/User/view/{id}")
async def user_view(
    id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Render admin user detail page."""
    return templates.TemplateResponse(request, "admin/bizuser/user-view.html", {
        "user": current_user,
        "target_user_id": id,
    })


@router.get("/admin/bizuser/departments")
async def dept_list(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Render admin department list page."""
    return templates.TemplateResponse(request, "admin/bizuser/dept-list.html", {
        "user": current_user,
    })


@router.get("/admin/bizuser/Department/view/{id}")
async def dept_view(
    id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Render admin department detail page."""
    return templates.TemplateResponse(request, "admin/bizuser/dept-view.html", {
        "user": current_user,
        "dept_id": id,
    })


@router.get("/admin/bizuser/role-privileges")
async def role_privileges(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Render role privileges page."""
    return templates.TemplateResponse(request, "admin/bizuser/role-privileges.html", {
        "user": current_user,
    })


@router.get("/admin/bizuser/Role/view/{id}")
async def role_view(
    id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Render admin role detail page."""
    return templates.TemplateResponse(request, "admin/bizuser/role-view.html", {
        "user": current_user,
        "role_id": id,
    })


@router.get("/admin/bizuser/teams")
async def team_list(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Render admin team list page."""
    return templates.TemplateResponse(request, "admin/bizuser/team-list.html", {
        "user": current_user,
    })


@router.get("/admin/bizuser/Team/view/{id}")
async def team_view(
    id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Render admin team detail page."""
    return templates.TemplateResponse(request, "admin/bizuser/team-view.html", {
        "user": current_user,
        "team_id": id,
    })


# ══════════════════════════════════════════════════════════════════════
# API endpoints — User Management (UsersGetting + UserSettingsController)
# ══════════════════════════════════════════════════════════════════════


@router.get("/admin/bizuser/user-list")
async def api_user_list(
    page_no: int = Query(1, alias="pageNo"),
    page_size: int = Query(20, alias="pageSize"),
    q: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get paginated user list.

    Migrated from UsersGetting.users.
    """
    query = db.query(User)

    if q:
        query = query.filter(
            (User.full_name.ilike(f"%{q}%")) |
            (User.login_name.ilike(f"%{q}%")) |
            (User.email.ilike(f"%{q}%"))
        )

    total = query.count()
    users = query.offset((page_no - 1) * page_size).limit(page_size).all()

    result = []
    for u in users:
        result.append({
            "id": str(u.id),
            "fullName": u.full_name,
            "loginName": u.login_name,
            "email": u.email,
            "deptId": str(u.dept_id) if u.dept_id else None,
            "isDisabled": u.is_disabled,
            "createdOn": str(u.created_on) if u.created_on else None,
        })

    return {
        "error_code": 0,
        "data": {
            "total": total,
            "pageNo": page_no,
            "pageSize": page_size,
            "data": result,
        },
    }


@router.get("/admin/bizuser/user-search")
async def api_user_search(
    q: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Search users.

    Migrated from UsersGetting.users / user-selector.
    """
    results = search_users(db, q)
    return {"error_code": 0, "data": results}


@router.get("/admin/bizuser/user/{id}")
async def api_user_get(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a single user by ID.

    Migrated from UserSettingsController.
    """
    user = db.query(User).filter(User.id == id).first()
    if not user:
        return {"error_code": 404, "error_msg": "User not found"}

    return {
        "error_code": 0,
        "data": {
            "id": str(user.id),
            "fullName": user.full_name,
            "loginName": user.login_name,
            "email": user.email,
            "deptId": str(user.dept_id) if user.dept_id else None,
            "isDisabled": user.is_disabled,
            "createdOn": str(user.created_on) if user.created_on else None,
        },
    }


# ══════════════════════════════════════════════════════════════════════
# API endpoints — Department Management
# ══════════════════════════════════════════════════════════════════════


@router.get("/admin/bizuser/dept-list")
async def api_dept_list(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all departments.

    Migrated from DepartmentController.
    """
    depts = db.query(Department).all()
    result = []
    for d in depts:
        result.append({
            "id": str(d.id),
            "name": d.name,
            "parentId": str(d.parent_id) if d.parent_id else None,
            "isDisabled": d.is_disabled,
        })

    return {"error_code": 0, "data": result}


@router.post("/admin/bizuser/dept-save")
async def api_dept_save(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create or update a department.

    Migrated from DepartmentController.
    """
    body = await request.json()
    dept_id = body.get("id")
    name = body.get("name")
    parent_id = body.get("parentId")

    if not name:
        return {"error_code": 400, "error_msg": "Department name required"}

    if dept_id:
        dept = db.query(Department).filter(Department.id == dept_id).first()
        if not dept:
            return {"error_code": 404, "error_msg": "Department not found"}
        dept.name = name
        dept.parent_id = parent_id
    else:
        import uuid
        dept = Department(id=str(uuid.uuid4()), name=name, parent_id=parent_id)
        db.add(dept)

    db.commit()
    return {"error_code": 0, "data": {"id": str(dept.id), "name": dept.name}}


@router.post("/admin/bizuser/dept-delete")
async def api_dept_delete(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a department.

    Migrated from DepartmentController.
    """
    body = await request.json()
    dept_id = body.get("id")

    if not dept_id:
        return {"error_code": 400, "error_msg": "Department ID required"}

    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        return {"error_code": 404, "error_msg": "Department not found"}

    # Check if any users belong to this department
    users_count = db.query(User).filter(User.dept_id == dept_id).count()
    if users_count > 0:
        return {"error_code": 400, "error_msg": f"Cannot delete department with {users_count} users"}

    db.delete(dept)
    db.commit()
    return {"error_code": 0, "data": True}


# ══════════════════════════════════════════════════════════════════════
# API endpoints — Role Management (RolePrivilegesController)
# Migrated from RolePrivilegesController.java
# ══════════════════════════════════════════════════════════════════════


@router.get("/admin/bizuser/role-list")
async def api_role_list(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all roles.

    Migrated from RolePrivilegesController.
    """
    roles = list_roles(db)
    return {"error_code": 0, "data": roles}


@router.post("/admin/bizuser/role-save")
async def api_role_save(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create or update a role.

    Migrated from RolePrivilegesController.
    """
    body = await request.json()
    role_id = body.get("id")
    name = body.get("name")

    if not name:
        return {"error_code": 400, "error_msg": "Role name required"}

    if role_id:
        result = update_role(db, role_id, name, str(current_user.user_id))
    else:
        result = create_role(db, name, str(current_user.user_id))

    if isinstance(result, str):
        return {"error_code": 400, "error_msg": result}
    return {"error_code": 0, "data": result}


@router.post("/admin/bizuser/role-delete")
async def api_role_delete(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a role.

    Migrated from RolePrivilegesController.
    """
    body = await request.json()
    role_id = body.get("id")

    if not role_id:
        return {"error_code": 400, "error_msg": "Role ID required"}

    result = delete_role(db, role_id, str(current_user.user_id))
    if isinstance(result, str):
        return {"error_code": 400, "error_msg": result}
    return {"error_code": 0, "data": True}


@router.get("/admin/bizuser/role-privileges-data")
async def api_role_privileges(
    role: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get role privileges.

    Migrated from RolePrivilegesController.
    """
    result = get_role_privileges(db, role)
    return {"error_code": 0, "data": result}


@router.post("/admin/bizuser/role-privileges-save")
async def api_save_role_privileges(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save role privileges.

    Migrated from RolePrivilegesController.
    """
    body = await request.json()
    role_id = body.get("role")
    privileges = body.get("privileges", [])

    if not role_id:
        return {"error_code": 400, "error_msg": "Role ID required"}

    result = set_role_privileges(db, role_id, privileges, str(current_user.user_id))
    if isinstance(result, str):
        return {"error_code": 400, "error_msg": result}
    return {"error_code": 0, "data": True}


# ══════════════════════════════════════════════════════════════════════
# API endpoints — Team Management
# Migrated from TeamController.java
# ══════════════════════════════════════════════════════════════════════


@router.get("/admin/bizuser/team-list-data")
async def api_team_list(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all teams.

    Migrated from TeamController.
    """
    teams = list_teams(db)
    return {"error_code": 0, "data": teams}


@router.post("/admin/bizuser/team-save")
async def api_team_save(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create or update a team.

    Migrated from TeamController.
    """
    body = await request.json()
    team_id = body.get("id")
    name = body.get("name")

    if not name:
        return {"error_code": 400, "error_msg": "Team name required"}

    if team_id:
        result = update_team(db, team_id, name, str(current_user.user_id))
    else:
        result = create_team(db, name, str(current_user.user_id))

    if isinstance(result, str):
        return {"error_code": 400, "error_msg": result}
    return {"error_code": 0, "data": result}


@router.post("/admin/bizuser/team-delete")
async def api_team_delete(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a team.

    Migrated from TeamController.
    """
    body = await request.json()
    team_id = body.get("id")

    if not team_id:
        return {"error_code": 400, "error_msg": "Team ID required"}

    result = delete_team(db, team_id, str(current_user.user_id))
    if isinstance(result, str):
        return {"error_code": 400, "error_msg": result}
    return {"error_code": 0, "data": True}


@router.get("/admin/bizuser/team-members")
async def api_team_members(
    team: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get team members.

    Migrated from TeamController.
    """
    members = get_team_members(db, team)
    return {"error_code": 0, "data": members}


@router.post("/admin/bizuser/team-add-member")
async def api_team_add_member(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add member(s) to a team.

    Migrated from TeamController.
    """
    body = await request.json()
    team_id = body.get("team")
    user_ids = body.get("users", [])

    if not team_id:
        return {"error_code": 400, "error_msg": "Team ID required"}

    results = []
    for uid in user_ids:
        err = add_team_member(db, team_id, uid, str(current_user.user_id))
        results.append({"userId": uid, "error": err} if err else {"userId": uid, "success": True})

    return {"error_code": 0, "data": results}


@router.post("/admin/bizuser/team-remove-member")
async def api_team_remove_member(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove member(s) from a team.

    Migrated from TeamController.
    """
    body = await request.json()
    team_id = body.get("team")
    user_ids = body.get("users", [])

    if not team_id:
        return {"error_code": 400, "error_msg": "Team ID required"}

    results = []
    for uid in user_ids:
        err = remove_team_member(db, team_id, uid, str(current_user.user_id))
        results.append({"userId": uid, "error": err} if err else {"userId": uid, "success": True})

    return {"error_code": 0, "data": results}


@router.get("/admin/bizuser/user-teams")
async def api_user_teams(
    user: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get teams a user belongs to.

    Migrated from TeamController.
    """
    teams = get_user_teams(db, user)
    return {"error_code": 0, "data": teams}
