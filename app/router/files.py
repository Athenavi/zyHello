"""File management routes — upload, download, delete, move, list."""
import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.services.auth_service import decode_access_token
from app.models import User
from app.schemas.file import (
    DeleteFilesRequest,
    MoveFilesRequest,
    CheckFilesRequest,
    CheckReadableRequest,
    FileEditRequest,
)
from app.services import file_service
from app.template_deps import templates
from app.models import Attachment, AttachmentFolder
import mimetypes

router = APIRouter()

UPLOAD_DIR = "app/static/uploads"


# ── File Manager routes (FileManagerController) ─────────────────────


@router.post("/files/post-files")
async def post_files(
    files: list[UploadFile] = File(...),
    folder_id: str = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload and register files."""
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    results = []
    for upload in files:
        ext = os.path.splitext(upload.filename)[1] if upload.filename else ""
        saved_name = f"{uuid.uuid4().hex[:12]}{ext}"
        filepath = os.path.join(UPLOAD_DIR, saved_name)
        content = await upload.read()
        with open(filepath, "wb") as f:
            f.write(content)

        from app.models import Attachment
        att = Attachment(
            attachment_id=uuid.uuid4().hex[:20],
            file_name=upload.filename or saved_name,
            file_path=f"uploads/{saved_name}",
            file_size=len(content),
            belong_entity=0,
            in_folder=folder_id,
            created_by=current_user.user_id,
        )
        db.add(att)
        results.append({
            "attachment_id": att.attachment_id,
            "file_name": att.file_name,
            "file_size": att.file_size,
        })
    db.commit()
    return {"ok": True, "data": results}


@router.post("/files/delete-files")
async def delete_files(
    body: DeleteFilesRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Soft-delete files."""
    count = file_service.delete_files(db, current_user.user_id, body.file_ids)
    return {"ok": True, "deleted": count}


@router.post("/files/move-files")
async def move_files(
    body: MoveFilesRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Move files to a folder."""
    count = file_service.move_files(db, current_user.user_id, body.file_ids, body.folder_id)
    return {"ok": True, "moved": count}


@router.post("/files/check-files")
async def check_files(
    body: CheckFilesRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Check for filename conflicts."""
    conflicts = file_service.check_files(db, body.filenames, body.folder_id)
    return {"ok": True, "conflicts": conflicts}


@router.post("/files/check-readable")
async def check_readable(
    body: CheckReadableRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Check if a file is readable by current user."""
    file_path = file_service.check_readable(db, body.file_id, current_user.user_id)
    if not file_path:
        raise HTTPException(status_code=403, detail="File not accessible")
    return {"ok": True, "file_path": file_path}


@router.post("/files/batch-download")
async def download_batch(
    file_ids: list[str],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Batch download files (returns paths)."""
    from app.models import Attachment
    results = []
    for fid in file_ids:
        att = db.query(Attachment).filter(Attachment.attachment_id == fid).first()
        if att:
            full_path = os.path.join("app/static", att.file_path)
            if os.path.isfile(full_path):
                results.append({"file_id": fid, "file_path": att.file_path, "file_name": att.file_name})
    return {"ok": True, "data": results}


@router.get("/files/download")
async def download(
    file_id: str = Query(...),
    token: str = Query(None),
    request: Request = None,
    db: Session = Depends(get_db),
):
    """Download a single file.

    Supports both Authorization header and ?token= query param (for <img> tags and new-tab links).
    """
    # Resolve user from Authorization header or ?token= query param
    auth_header = request.headers.get("authorization", "") if request else ""
    jwt_token = auth_header.replace("Bearer ", "") if auth_header.startswith("Bearer ") else (token or "")
    user_id = decode_access_token(jwt_token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user or user.is_disabled:
        raise HTTPException(status_code=403, detail="Access denied")

    from app.models import Attachment
    att = db.query(Attachment).filter(Attachment.attachment_id == file_id).first()
    if not att:
        raise HTTPException(status_code=404, detail="File not found")
    full_path = os.path.join("app/static", att.file_path)
    if not os.path.isfile(full_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    return FileResponse(full_path, filename=att.file_name)


@router.get("/files/preview/{file_id}")
async def preview_file(
    file_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get file preview info (metadata + download URL)."""
    att = db.query(Attachment).filter(Attachment.attachment_id == file_id).first()
    if not att or att.is_deleted:
        raise HTTPException(status_code=404, detail="File not found")
    ext = os.path.splitext(att.file_name)[1].lower() if att.file_name else ""
    preview_types = {
        ".jpg": "image", ".jpeg": "image", ".png": "image", ".gif": "image", ".webp": "image", ".svg": "image", ".bmp": "image",
        ".pdf": "pdf",
        ".txt": "text", ".md": "text", ".csv": "text", ".log": "text",
        ".mp4": "video", ".webm": "video", ".ogg": "video",
        ".mp3": "audio", ".wav": "audio", ".flac": "audio",
    }
    return {
        "error_code": 0,
        "data": {
            "file_id": att.attachment_id,
            "file_name": att.file_name,
            "file_size": att.file_size,
            "preview_type": preview_types.get(ext, "other"),
            "download_url": f"/files/download?file_id={att.attachment_id}",
            "img_url": f"/files/img/{att.attachment_id}" if preview_types.get(ext) == "image" else None,
        },
    }


@router.get("/files/img/{file_id}")
async def serve_image(
    file_id: str,
    token: str = Query(None),
    request: Request = None,
    db: Session = Depends(get_db),
):
    """Serve an image file for inline preview."""
    auth_header = request.headers.get("authorization", "") if request else ""
    jwt_token = auth_header.replace("Bearer ", "") if auth_header.startswith("Bearer ") else (token or "")
    user_id = decode_access_token(jwt_token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user or user.is_disabled:
        raise HTTPException(status_code=403, detail="Access denied")

    att = db.query(Attachment).filter(Attachment.attachment_id == file_id).first()
    if not att or att.is_deleted:
        raise HTTPException(status_code=404, detail="File not found")
    full_path = os.path.join("app/static", att.file_path)
    if not os.path.isfile(full_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    media_type, _ = mimetypes.guess_type(att.file_name)
    return FileResponse(full_path, media_type=media_type or "application/octet-stream")


@router.post("/files/delete-folder")
async def delete_folder_endpoint(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Soft-delete a folder and its files."""
    body = await request.json()
    folder_id = body.get("folder_id") or body.get("folderId")
    if not folder_id:
        return {"ok": False, "error": "Folder ID required"}
    ok = file_service.delete_folder(db, folder_id, current_user.user_id)
    if not ok:
        return {"ok": False, "error": "Folder not found or not owned by you"}
    return {"ok": True}


@router.post("/files/file-edit")
async def file_edit(
    body: FileEditRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Edit file metadata (rename, move)."""
    from app.models import Attachment
    att = db.query(Attachment).filter(
        Attachment.attachment_id == body.file_id,
        Attachment.created_by == current_user.user_id,
    ).first()
    if not att:
        raise HTTPException(status_code=404, detail="File not found")
    if body.file_name:
        att.file_name = body.file_name
    if body.folder_id is not None:
        att.in_folder = body.folder_id
    db.commit()
    return {"ok": True}


# ── File List routes (FileListController) ───────────────────────────


@router.get("/files/home")
async def page_index(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Render file home page."""
    return templates.TemplateResponse(request, "files/attachment.html", {
        "user": current_user,
    })


@router.get("/files/attachment")
async def page_attachment(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Render attachment list page."""
    return templates.TemplateResponse(request, "files/attachment.html", {
        "user": current_user,
    })


@router.get("/files/docs")
async def page_docs(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Render docs page."""
    return templates.TemplateResponse(request, "files/docs.html", {
        "user": current_user,
    })


@router.get("/files/list-file")
async def list_file(
    folder_id: str = Query(None),
    page_no: int = Query(1),
    page_size: int = Query(40),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List files in a folder."""
    data = file_service.list_files(db, current_user.user_id, folder_id, page_no, page_size)
    return {"ok": True, "data": data}


@router.get("/files/tree-folder")
async def list_folder(
    parent_id: str = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List folders (tree structure)."""
    data = file_service.list_folders(db, current_user.user_id, parent_id)
    return {"ok": True, "data": data}


@router.post("/files/create-folder")
async def create_folder(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new folder."""
    body = await request.json()
    folder_name = body.get("name") or body.get("folder_name")
    parent_id = body.get("parentId") or body.get("parent_id")
    if not folder_name:
        return {"ok": False, "error": "Folder name required"}
    result = file_service.create_folder(db, current_user.user_id, folder_name, parent_id)
    return {"ok": True, "data": result}


@router.get("/files/tree-entity")
async def list_entity(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List entities that have attachments."""
    data = file_service.list_entities(db)
    return {"ok": True, "data": data}
