"""File management service — upload, download, delete, move."""
import os
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.models import Attachment, AttachmentFolder

UPLOAD_DIR = "app/static/uploads"


def post_files(db: Session, user_id: str, filenames: list[str], folder_id: str = None) -> list[dict]:
    """Register uploaded file attachments."""
    results = []
    for name in filenames:
        att = Attachment(
            attachment_id=uuid.uuid4().hex[:20],
            file_name=name,
            file_path=f"uploads/{name}",
            file_size=0,
            belong_entity=0,
            in_folder=folder_id,
            created_by=user_id,
        )
        db.add(att)
        results.append({"attachment_id": att.attachment_id, "file_name": att.file_name})
    db.commit()
    return results


def delete_files(db: Session, user_id: str, file_ids: list[str]) -> int:
    """Delete files. Returns count deleted."""
    count = 0
    for fid in file_ids:
        att = db.query(Attachment).filter(Attachment.attachment_id == fid).first()
        if att and (att.created_by == user_id):
            att.is_deleted = True
            count += 1
    db.commit()
    return count


def move_files(db: Session, user_id: str, file_ids: list[str], folder_id: str = None) -> int:
    """Move files to a folder. Returns count moved."""
    count = 0
    for fid in file_ids:
        att = db.query(Attachment).filter(
            Attachment.attachment_id == fid,
            Attachment.created_by == user_id,
        ).first()
        if att:
            att.in_folder = folder_id
            count += 1
    db.commit()
    return count


def check_files(db: Session, filenames: list[str], folder_id: str = None) -> dict:
    """Check for filename conflicts in a folder. Returns dict of {filename: existing_id}."""
    conflicts = {}
    for name in filenames:
        query = db.query(Attachment).filter(
            Attachment.file_name == name,
            Attachment.belong_entity == 0,
            Attachment.is_deleted == False,
        )
        if folder_id:
            query = query.filter(Attachment.in_folder == folder_id)
        else:
            query = query.filter(Attachment.in_folder.is_(None))
        existing = query.first()
        if existing:
            conflicts[name] = existing.attachment_id
    return conflicts


def check_readable(db: Session, file_id: str, user_id: str) -> Optional[str]:
    """Check if a file is readable by user. Returns file path or None."""
    att = db.query(Attachment).filter(Attachment.attachment_id == file_id).first()
    if not att:
        return None
    # Check if user has access (owner or public folder)
    if att.created_by == user_id:
        return att.file_path
    folder = db.query(AttachmentFolder).filter(AttachmentFolder.folder_id == att.in_folder).first()
    if folder and folder.scope == 2:  # public
        return att.file_path
    return None


def list_files(db: Session, user_id: str, folder_id: str = None, page_no: int = 1, page_size: int = 40) -> list[dict]:
    """List files in a folder."""
    query = db.query(Attachment).filter(
        Attachment.is_deleted == False,
        Attachment.belong_entity == 0,
    )
    if folder_id:
        query = query.filter(Attachment.in_folder == folder_id)
    else:
        query = query.filter(Attachment.in_folder.is_(None))

    offset = (page_no - 1) * page_size
    files = query.order_by(Attachment.created_on.desc()).offset(offset).limit(page_size).all()

    return [
        {
            "attachment_id": a.attachment_id,
            "file_name": a.file_name,
            "file_path": a.file_path,
            "file_size": a.file_size,
            "created_by": a.created_by,
            "created_on": a.created_on.isoformat() if a.created_on else None,
        }
        for a in files
    ]


def create_folder(db: Session, user_id: str, folder_name: str, parent_id: str = None) -> dict:
    """Create a new folder."""
    folder = AttachmentFolder(
        folder_id=uuid.uuid4().hex[:20],
        folder_name=folder_name,
        parent_id=parent_id,
        scope=1,
        created_by=user_id,
    )
    db.add(folder)
    db.commit()
    db.refresh(folder)
    return {
        "folder_id": folder.folder_id,
        "folder_name": folder.folder_name,
        "scope": folder.scope,
    }


def list_folders(db: Session, user_id: str, parent_id: str = None) -> list[dict]:
    """List folders."""
    query = db.query(AttachmentFolder).filter(AttachmentFolder.is_deleted == False)
    if parent_id:
        query = query.filter(AttachmentFolder.parent_id == parent_id)
    else:
        query = query.filter(AttachmentFolder.parent_id.is_(None))

    folders = query.order_by(AttachmentFolder.folder_name).all()
    return [
        {
            "folder_id": f.folder_id,
            "folder_name": f.folder_name,
            "scope": f.scope,
            "created_by": f.created_by,
        }
        for f in folders
    ]


def list_entities(db: Session) -> list[dict]:
    """List entities that have attachments."""
    from sqlalchemy import distinct
    results = db.query(distinct(Attachment.belong_entity)).filter(
        Attachment.belong_entity != 0,
        Attachment.is_deleted == False,
    ).all()
    return [{"entity_code": r[0]} for r in results]
