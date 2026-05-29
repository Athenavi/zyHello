"""Project and task service."""
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import ProjectConfig, ProjectPlanConfig, ProjectTask, TaskComment, TaskTag


def get_project(db: Session, project_id: str, user_id: str) -> Optional[dict]:
    """Get project details by ID."""
    p = db.query(ProjectConfig).filter(ProjectConfig.config_id == project_id).first()
    if not p:
        return None
    return {
        "config_id": p.config_id,
        "project_name": p.project_name,
        "project_code": p.project_code,
        "icon_name": p.icon_name,
        "scope": p.scope,
        "status": p.status,
        "members": p.members,
    }


def search_project(db: Session, query_str: str) -> list[dict]:
    """Search projects by name or code."""
    projects = db.query(ProjectConfig).filter(
        ProjectConfig.is_disabled == False,
        (ProjectConfig.project_name.ilike(f"%{query_str}%")) |
        (ProjectConfig.project_code.ilike(f"%{query_str}%")),
    ).all()
    return [
        {
            "config_id": p.config_id,
            "project_name": p.project_name,
            "project_code": p.project_code,
        }
        for p in projects
    ]


def get_plans(db: Session, project_id: str) -> list[dict]:
    """Get plans for a project."""
    plans = db.query(ProjectPlanConfig).filter(
        ProjectPlanConfig.project_id == project_id
    ).order_by(ProjectPlanConfig.seq).all()
    return [
        {
            "plan_id": p.plan_id,
            "plan_name": p.plan_name,
            "flow_status": p.flow_status,
            "seq": p.seq,
        }
        for p in plans
    ]


def get_task(db: Session, task_id: str) -> Optional[dict]:
    """Get task details."""
    t = db.query(ProjectTask).filter(ProjectTask.task_id == task_id).first()
    if not t:
        return None
    return {
        "task_id": t.task_id,
        "project_id": t.project_id,
        "project_plan_id": t.project_plan_id,
        "task_number": t.task_number,
        "task_name": t.task_name,
        "description": t.description,
        "priority": t.priority,
        "status": t.status,
        "deadline": t.deadline.isoformat() if t.deadline else None,
        "created_by": t.created_by,
        "modified_on": t.modified_on.isoformat() if t.modified_on else None,
    }


def task_list(
    db: Session,
    project_id: str,
    plan_key: str = None,
    search: str = None,
    sort: str = "seq",
    page_no: int = 1,
    page_size: int = 40,
) -> dict:
    """List tasks with filtering and pagination."""
    query = db.query(ProjectTask).filter(
        ProjectTask.project_id == project_id,
        ProjectTask.is_deleted == False,
    )

    if plan_key:
        query = query.filter(ProjectTask.project_plan_id == plan_key)

    if search:
        query = query.filter(
            (ProjectTask.task_name.ilike(f"%{search}%")) |
            (ProjectTask.task_number.cast(str).ilike(f"%{search}%"))
        )

    count = query.count()
    if count == 0:
        return {"count": 0, "tasks": []}

    if sort == "deadline":
        query = query.order_by(ProjectTask.deadline.desc())
    elif sort == "modifiedOn":
        query = query.order_by(ProjectTask.modified_on.desc())
    else:
        query = query.order_by(ProjectTask.seq)

    offset = (page_no - 1) * page_size
    tasks = query.offset(offset).limit(page_size).all()

    return {
        "count": count,
        "tasks": [
            {
                "task_id": t.task_id,
                "task_name": t.task_name,
                "task_number": t.task_number,
                "priority": t.priority,
                "status": t.status,
                "deadline": t.deadline.isoformat() if t.deadline else None,
                "project_plan_id": t.project_plan_id,
                "created_by": t.created_by,
            }
            for t in tasks
        ],
    }


def get_project_and_plans(db: Session, user_id: str) -> list[dict]:
    """Get all projects with their plans."""
    projects = db.query(ProjectConfig).filter(ProjectConfig.is_disabled == False).all()
    result = []
    for p in projects:
        plans = get_plans(db, p.config_id)
        result.append({
            "config_id": p.config_id,
            "project_name": p.project_name,
            "project_code": p.project_code,
            "plans": plans,
        })
    return result


def related_task_list(db: Session, task_id: str) -> list[dict]:
    """Get tasks related to a given task (same project)."""
    task = db.query(ProjectTask).filter(ProjectTask.task_id == task_id).first()
    if not task:
        return []
    related = db.query(ProjectTask).filter(
        ProjectTask.project_id == task.project_id,
        ProjectTask.task_id != task_id,
        ProjectTask.is_deleted == False,
    ).limit(20).all()
    return [
        {"task_id": t.task_id, "task_name": t.task_name, "task_number": t.task_number}
        for t in related
    ]


def get_task_tags(db: Session, project_id: str) -> list[dict]:
    """Get tags for a project."""
    tags = db.query(TaskTag).filter(TaskTag.project_id == project_id).all()
    return [
        {"tag_id": t.tag_id, "tag_name": t.tag_name, "color": t.color}
        for t in tags
    ]


def save_task_tag(db: Session, project_id: str, tag_name: str, color: str, user_id: str) -> TaskTag:
    """Create or update a task tag."""
    tag = TaskTag(
        tag_id=uuid.uuid4().hex[:20],
        tag_name=tag_name,
        color=color,
        project_id=project_id,
        created_by=user_id,
    )
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


def delete_task_tag(db: Session, tag_id: str) -> bool:
    """Delete a task tag."""
    tag = db.query(TaskTag).filter(TaskTag.tag_id == tag_id).first()
    if not tag:
        return False
    db.delete(tag)
    db.commit()
    return True


def get_task_comments(db: Session, task_id: str) -> list[dict]:
    """Get comments for a task."""
    comments = db.query(TaskComment).filter(
        TaskComment.task_id == task_id,
        TaskComment.is_deleted == False,
    ).order_by(TaskComment.created_on.desc()).all()
    return [
        {
            "comment_id": c.comment_id,
            "content": c.content,
            "created_by": c.created_by,
            "created_on": c.created_on.isoformat() if c.created_on else None,
        }
        for c in comments
    ]


def save_task_comment(db: Session, task_id: str, content: str, user_id: str) -> TaskComment:
    """Save a comment on a task."""
    comment = TaskComment(
        comment_id=uuid.uuid4().hex[:20],
        task_id=task_id,
        content=content,
        created_by=user_id,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


def delete_task_comment(db: Session, comment_id: str, user_id: str) -> bool:
    """Delete a task comment."""
    comment = db.query(TaskComment).filter(
        TaskComment.comment_id == comment_id,
        TaskComment.created_by == user_id,
    ).first()
    if not comment:
        return False
    comment.is_deleted = True
    db.commit()
    return True
