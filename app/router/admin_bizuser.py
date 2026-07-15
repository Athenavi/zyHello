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
        # Look up department name
        dept_name = None
        if u.dept_id:
            dept = db.query(Department).filter(Department.dept_id == u.dept_id).first()
            if dept:
                dept_name = dept.name
        result.append({
            "id": str(u.user_id),
            "fullName": u.full_name,
            "loginName": u.login_name,
            "email": u.email,
            "deptId": str(u.dept_id) if u.dept_id else None,
            "department": dept_name,
            "deptName": dept_name,
            "isDisabled": u.is_disabled,
            "disabled": u.is_disabled,
            "createdOn": str(u.created_on) if u.created_on else None,
        })

    return {
        "error_code": 0,
        "data": result,
        "total": total,
        "pageNo": page_no,
        "pageSize": page_size,
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
    user = db.query(User).filter(User.user_id == id).first()
    if not user:
        return {"error_code": 404, "error_msg": "User not found"}

    return {
        "error_code": 0,
        "data": {
            "id": str(user.user_id),
            "fullName": user.full_name,
            "loginName": user.login_name,
            "email": user.email,
            "deptId": str(user.dept_id) if user.dept_id else None,
            "isDisabled": user.is_disabled,
            "createdOn": str(user.created_on) if user.created_on else None,
        },
    }


# ── User Management API ───────────────────────────────────────────


@router.post("/admin/bizuser/user/disable")
async def api_user_disable(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Disable or enable a user."""
    body = await request.json()
    user_id = body.get("id")
    enable = body.get("enabled", False)
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        return {"error_code": 404, "error_msg": "User not found"}
    user.is_disabled = not enable
    db.commit()
    return {"error_code": 0, "data": True}


@router.post("/admin/bizuser/user-save")
async def api_user_save(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create or update a user."""
    body = await request.json()
    user_id = body.get("id")
    login_name = body.get("loginName") or body.get("login_name")
    full_name = body.get("fullName") or body.get("full_name")
    email = body.get("email")
    password = body.get("password")
    dept_id = body.get("deptId") or body.get("dept_id")
    role_id = body.get("roleId") or body.get("role_id")

    if not login_name or not full_name:
        return {"error_code": 400, "error_msg": "登录名和姓名不能为空"}

    if user_id:
        user = db.query(User).filter(User.user_id == user_id).first()
        if not user:
            return {"error_code": 404, "error_msg": "用户不存在"}
        user.login_name = login_name
        user.full_name = full_name
        if email is not None:
            user.email = email
        if dept_id is not None:
            user.dept_id = dept_id
        if role_id is not None:
            user.role_id = role_id
        if password:
            from app.services.auth_service import _hash_password
            user.password = _hash_password(password)
        db.commit()
        return {"error_code": 0, "data": str(user.user_id)}
    else:
        import uuid
        from app.services.auth_service import _hash_password
        new_id = "001-" + uuid.uuid4().hex[:16]
        user = User(
            user_id=new_id,
            login_name=login_name,
            full_name=full_name,
            email=email or "",
            password=_hash_password(password or "123456"),
            dept_id=dept_id,
            role_id=role_id,
        )
        db.add(user)
        db.commit()
        return {"error_code": 0, "data": new_id}


@router.post("/admin/bizuser/user/reset-password")
async def api_user_reset_password(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Reset a user's password."""
    body = await request.json()
    user_id = body.get("id")
    new_passwd = body.get("password", "123456")
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        return {"error_code": 404, "error_msg": "User not found"}
    from app.services.auth_service import _hash_password
    user.password = _hash_password(new_passwd)
    db.commit()
    return {"error_code": 0, "data": True}


@router.post("/admin/bizuser/user-delete")
async def api_user_delete(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Soft-delete a user."""
    body = await request.json()
    user_id = body.get("id")
    if not user_id:
        return {"error_code": 400, "error_msg": "缺少用户ID"}
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        return {"error_code": 404, "error_msg": "用户不存在"}
    user.is_disabled = True
    db.commit()
    return {"error_code": 0, "data": True}


@router.post("/admin/bizuser/user/change-dept")
async def api_user_change_dept(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Change a user's department."""
    body = await request.json()
    user_id = body.get("id")
    dept_id = body.get("deptId")
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        return {"error_code": 404, "error_msg": "User not found"}
    user.dept_id = dept_id
    db.commit()
    return {"error_code": 0, "data": True}


@router.post("/admin/bizuser/user/change-role")
async def api_user_change_role(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Change a user's role."""
    body = await request.json()
    user_id = body.get("id")
    role_id = body.get("roleId")
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        return {"error_code": 404, "error_msg": "User not found"}
    user.role_id = role_id
    db.commit()
    return {"error_code": 0, "data": True}


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
            "id": str(d.dept_id),
            "name": d.name,
            "parentId": str(d.parent_id) if d.parent_id else None,
            "isDisabled": d.is_disabled,
        })

    return {"error_code": 0, "data": result}


@router.get("/admin/bizuser/dept-tree")
async def api_dept_tree(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get department tree structure.

    Migrated from DepartmentController.
    """
    depts = db.query(Department).all()
    flat = []
    for d in depts:
        flat.append({
            "id": str(d.dept_id),
            "name": d.name,
            "parentId": str(d.parent_id) if d.parent_id else None,
            "isDisabled": d.is_disabled,
            "children": [],
        })
    by_id = {item["id"]: item for item in flat}
    tree = []
    for item in flat:
        pid = item["parentId"]
        if pid and pid in by_id:
            by_id[pid]["children"].append(item)
        else:
            tree.append(item)
    return tree


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
        dept = db.query(Department).filter(Department.dept_id == dept_id).first()
        if not dept:
            return {"error_code": 404, "error_msg": "Department not found"}
        dept.name = name
        dept.parent_id = parent_id
    else:
        import uuid
        dept = Department(dept_id=str(uuid.uuid4()), name=name, parent_id=parent_id)
        db.add(dept)

    db.commit()
    return {"error_code": 0, "data": {"id": str(dept.dept_id), "name": dept.name}}


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

    dept = db.query(Department).filter(Department.dept_id == dept_id).first()
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
        result = update_role(db, role_id, name=name)
    else:
        result = create_role(db, name)

    if isinstance(result, str):
        return {"error_code": 400, "error_msg": result}
    if result is None:
        return {"error_code": 400, "error_msg": "角色不存在"}
    return {"error_code": 0, "data": {"id": str(result.role_id), "name": result.name}}


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

    result = delete_role(db, role_id)
    if not result:
        return {"error_code": 400, "error_msg": "角色不存在"}
    return {"error_code": 0, "data": True}


@router.get("/admin/bizuser/role-privileges-data")
async def api_role_privileges(
    role: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get role privileges in frontend format."""
    from app.core.metadata import get_entities
    raw = get_role_privileges(db, role)
    # Convert {entity, definition: {C:bool, R:bool}} to frontend {entityName, entityLabel, C:number, R:number, ...}
    priv_map = {r["entity"]: r["definition"] for r in raw}
    entities = []
    for em in get_entities():
        defn = priv_map.get(em.entity_name, {})
        entities.append({
            "entityName": em.entity_name,
            "entityLabel": em.entity_label,
            "C": 4 if defn.get("C") else 0,
            "R": 4 if defn.get("R") else 0,
            "U": 4 if defn.get("U") else 0,
            "D": 4 if defn.get("D") else 0,
            "A": 4 if defn.get("A") else 0,
            "S": 4 if defn.get("S") else 0,
        })
    # Zero privileges (not stored in backend, default all disabled)
    zeros = {}
    for name in ["AllowLogin","AllowCustomNav","AllowCustomChart","AllowCustomDataList",
                 "AllowBatchUpdate","AllowRecordMerge","AllowRevokeApproval","AllowDataImport",
                 "AllowDataExport","AllowNoDesensitized","AllowAtAllUsers","EnableBizzPart","AllowUseAiBot"]:
        zeros[name] = 0
    return {"error_code": 0, "data": {"entities": entities, "zeroPrivileges": zeros}}


@router.post("/admin/bizuser/role-privileges-save")
async def api_save_role_privileges(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save role privileges from frontend format."""
    body = await request.json()
    role_id = body.get("role")
    privileges = body.get("privileges", [])

    if not role_id:
        return {"error_code": 400, "error_msg": "Role ID required"}

    for priv in privileges:
        entity_name = priv.get("entityName")
        if not entity_name:
            continue
        # Convert scope levels (0=不允, 4=全部) to boolean
        definition = {
            "C": bool(priv.get("C", 0)),
            "R": bool(priv.get("R", 0)),
            "U": bool(priv.get("U", 0)),
            "D": bool(priv.get("D", 0)),
            "A": bool(priv.get("A", 0)),
            "S": bool(priv.get("S", 0)),
        }
        try:
            set_role_privileges(db, role_id, entity_name, definition)
        except Exception as e:
            return {"error_code": 400, "error_msg": str(e)}
    db.commit()
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
