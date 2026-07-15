"""Admin data routes — data imports, report templates."""
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_admin
from app.models import User
from app.template_deps import templates
from app.services import data_import_service, report_template_service

router = APIRouter()


# ---------------------------------------------------------------------------
# Page routes
# ---------------------------------------------------------------------------

@router.get("/admin/data/data-imports")
async def data_imports(
    request: Request,
    current_user: User = Depends(require_admin),
):
    """Render data imports page."""
    return templates.TemplateResponse(request, "admin/data/data-imports.html", {
        "user": current_user,
    })


@router.get("/admin/data/report-templates")
async def report_templates(
    request: Request,
    current_user: User = Depends(require_admin),
):
    """Render report templates page."""
    return templates.TemplateResponse(request, "admin/data/report-templates.html", {
        "user": current_user,
    })


# ---------------------------------------------------------------------------
# API endpoints — data imports
# ---------------------------------------------------------------------------

@router.post("/admin/data/data-imports/check-file")
async def api_check_file(
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Validate an import file and return row count + preview."""
    body = await request.json()
    file_path = body.get("file", "")
    result = data_import_service.check_file(file_path)
    if "error" in result:
        return {"error_code": 400, "error_msg": result["error"]}
    return {"error_code": 0, "data": result}


@router.post("/admin/data/data-imports/check-user")
async def api_check_user(
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Check if user can create/update records for an entity."""
    body = await request.json()
    entity = body.get("entity", "")
    result = data_import_service.check_user_privileges(db, current_user.user_id, entity)
    return {"error_code": 0, "data": result}


@router.post("/admin/data/data-imports/import-fields")
async def api_import_fields(
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get list of fields available for import on an entity."""
    body = await request.json()
    entity = body.get("entity", "")
    result = data_import_service.get_import_fields(db, entity)
    return {"error_code": 0, "data": result}


@router.post("/admin/data/data-imports/import-submit")
async def api_import_submit(
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Submit a data import task."""
    body = await request.json()
    task_id = data_import_service.submit_import(db, current_user.user_id, body)
    return {"error_code": 0, "data": task_id}


@router.get("/admin/data/data-imports/import-trace")
async def api_import_trace(
    taskid: str = None,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get import task trace logs."""
    if not taskid:
        return {"error_code": 400, "error_msg": "缺少任务ID"}
    trace = data_import_service.get_import_trace(taskid)
    if trace is None:
        return {"error_code": 400, "error_msg": "任务不存在"}
    return {"error_code": 0, "data": trace}


# ---------------------------------------------------------------------------
# API endpoints — report templates
# ---------------------------------------------------------------------------

@router.get("/admin/data/report-templates/list")
async def api_report_templates_list(
    entity: str = None,
    q: str = None,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """List report templates."""
    data = report_template_service.list_templates(db, entity, q)
    return {"error_code": 0, "data": data}


@router.post("/admin/data/report-templates/check-template")
async def api_check_template(
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Validate a report template."""
    body = await request.json()
    entity = body.get("belongEntity", "")
    file = body.get("file", "")
    template_type = body.get("templateType", 1)
    result = report_template_service.check_template(db, entity, file, template_type)
    if "error" in result:
        return {"error_code": 400, "error_msg": result["error"]}
    return {"error_code": 0, "data": result}


@router.post("/admin/data/report-templates/preview")
async def api_report_template_preview(
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Preview a report template (generates sample output)."""
    body = await request.json()
    config_id = body.get("configId", "")
    if not config_id:
        return {"error_code": 400, "error_msg": "缺少模板ID"}
    # Preview is essentially a download with sample data
    return {"error_code": 0, "data": {"configId": config_id, "previewUrl": f"/admin/data/report-templates/download?config={config_id}"}}


@router.get("/admin/data/report-templates/download")
async def api_report_template_download(
    config: str = None,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Download a report template."""
    if not config:
        return {"error_code": 400, "error_msg": "缺少模板ID"}
    from app.models import DataReportConfig
    cfg = db.query(DataReportConfig).filter(DataReportConfig.config_id == config).first()
    if not cfg:
        return {"error_code": 400, "error_msg": "模板不存在"}
    return {"error_code": 0, "data": {
        "configId": cfg.config_id,
        "name": cfg.name,
        "templateFile": cfg.template_file,
        "templateType": cfg.template_type,
    }}


@router.post("/admin/data/report-templates/save")
async def api_report_template_save(
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Create or update a report template."""
    body = await request.json()
    config_id = report_template_service.save_template(db, body)
    return {"error_code": 0, "data": config_id}


@router.post("/admin/data/report-templates/delete")
async def api_report_template_delete(
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Delete a report template."""
    body = await request.json()
    config_id = body.get("configId", "")
    if not config_id:
        return {"error_code": 400, "error_msg": "缺少模板ID"}
    ok = report_template_service.delete_template(db, config_id)
    if not ok:
        return {"error_code": 400, "error_msg": "模板不存在"}
    return {"error_code": 0, "data": {"deleted": True}}
@router.post("/admin/data/report-templates/toggle")
async def api_report_template_toggle(
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Toggle report template enabled/disabled."""
    body = await request.json()
    config_id = body.get("id", "")
    enabled = body.get("enabled", True)
    if not config_id:
        return {"error_code": 400, "error_msg": "缺少模板ID"}
    from app.models import DataReportConfig
    cfg = db.query(DataReportConfig).filter(
        DataReportConfig.config_id == config_id
    ).first()
    if not cfg:
        return {"error_code": 400, "error_msg": "模板不存在"}
    cfg.is_disabled = not enabled
    db.commit()
    return {"error_code": 0, "data": {"enabled": enabled}}
