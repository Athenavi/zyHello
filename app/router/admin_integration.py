"""Admin integration routes — storage, submail, DingTalk, WeChat Work, Feishu, AiBot, APIs."""
from datetime import datetime

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_admin
from app.models import User
from app.template_deps import templates
from app.services import configuration_service, apis_manager_service

router = APIRouter()


# ---------------------------------------------------------------------------
# Page routes
# ---------------------------------------------------------------------------

@router.get("/admin/integration/storage")
async def storage(
    request: Request,
    current_user: User = Depends(require_admin),
):
    """Render cloud storage configuration page."""
    return templates.TemplateResponse(request, "admin/integration/storage-qiniu.html", {
        "user": current_user,
    })


@router.get("/admin/integration/submail")
async def submail(
    request: Request,
    current_user: User = Depends(require_admin),
):
    """Render Submail (SMS/Email) configuration page."""
    return templates.TemplateResponse(request, "admin/integration/submail.html", {
        "user": current_user,
    })


@router.get("/admin/integration/dingtalk")
async def dingtalk(
    request: Request,
    current_user: User = Depends(require_admin),
):
    """Render DingTalk integration page."""
    return templates.TemplateResponse(request, "admin/integration/dingtalk.html", {
        "user": current_user,
    })


@router.get("/admin/integration/wxwork")
async def wxwork(
    request: Request,
    current_user: User = Depends(require_admin),
):
    """Render WeChat Work integration page."""
    return templates.TemplateResponse(request, "admin/integration/wxwork.html", {
        "user": current_user,
    })


@router.get("/admin/integration/feishu")
async def feishu(
    request: Request,
    current_user: User = Depends(require_admin),
):
    """Render Feishu integration page."""
    return templates.TemplateResponse(request, "admin/integration/feishu.html", {
        "user": current_user,
    })


@router.get("/admin/integration/aibot")
async def aibot(
    request: Request,
    current_user: User = Depends(require_admin),
):
    """Render AiBot integration page."""
    return templates.TemplateResponse(request, "admin/integration/aibot.html", {
        "user": current_user,
    })


@router.get("/admin/integration/apis-manager")
async def apis_manager(
    request: Request,
    current_user: User = Depends(require_admin),
):
    """Render APIs manager page."""
    return templates.TemplateResponse(request, "admin/integration/apis-manager.html", {
        "user": current_user,
    })


# ---------------------------------------------------------------------------
# API endpoints — system configuration
# ---------------------------------------------------------------------------

@router.get("/admin/integration/systems")
async def api_get_system_config(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get all system configuration."""
    data = configuration_service.get_system_config_data(db)
    return {"error_code": 0, "data": data}


@router.post("/admin/integration/systems")
async def api_save_system_config(
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Save system configuration."""
    body = await request.json()
    err = configuration_service.save_system_config(db, body)
    if err:
        return {"error_code": 400, "error_msg": err}
    return {"error_code": 0}


@router.post("/admin/integration/systems/backup")
async def api_backup(
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Perform database/file backup."""
    body = await request.json()
    backup_type = body.get("backupType", 3)
    result = configuration_service.do_backup(db, backup_type)
    return {"error_code": 0, "data": result}


# ---------------------------------------------------------------------------
# API endpoints — storage
# ---------------------------------------------------------------------------

@router.get("/admin/integration/storage-data")
async def api_get_storage(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get storage configuration."""
    data = configuration_service.get_storage_config(db)
    return {"error_code": 0, "data": data}


@router.post("/admin/integration/storage")
async def api_save_storage(
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Save storage configuration."""
    body = await request.json()
    err = configuration_service.save_storage_config(db, body)
    if err:
        return {"error_code": 400, "error_msg": err}
    return {"error_code": 0}


# ---------------------------------------------------------------------------
# API endpoints — submail (SMS/Email)
# ---------------------------------------------------------------------------

@router.get("/admin/integration/submail-data")
async def api_get_submail(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get SMS/email configuration."""
    data = configuration_service.get_submail_config(db)
    return {"error_code": 0, "data": data}


@router.post("/admin/integration/submail")
async def api_save_submail(
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Save SMS/email configuration."""
    body = await request.json()
    err = configuration_service.save_submail_config(db, body)
    if err:
        return {"error_code": 400, "error_msg": err}
    return {"error_code": 0}


@router.post("/admin/integration/submail/test")
async def api_test_submail(
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Test SMS or email send."""
    body = await request.json()
    msg_type = body.get("type", "SMS")
    receiver = body.get("to", "")
    result = configuration_service.test_submail(db, msg_type, receiver)
    if not result:
        return {"error_code": 400, "error_msg": "发送失败，请检查接收方信息"}
    return {"error_code": 0, "data": result}


@router.get("/admin/integration/submail/stats")
async def api_submail_stats(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get SMS/email sending statistics."""
    data = configuration_service.get_submail_stats(db)
    return {"error_code": 0, "data": data}


# ---------------------------------------------------------------------------
# API endpoints — DingTalk
# ---------------------------------------------------------------------------

@router.get("/admin/integration/dingtalk-data")
async def api_get_dingtalk(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get DingTalk configuration."""
    data = configuration_service.get_integration_config(db, "Dingtalk")
    return {"error_code": 0, "data": data}


@router.post("/admin/integration/dingtalk")
async def api_save_dingtalk(
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Save DingTalk configuration."""
    body = await request.json()
    configuration_service.save_integration_config(db, body)
    return {"error_code": 0}


# ---------------------------------------------------------------------------
# API endpoints — WeChat Work
# ---------------------------------------------------------------------------

@router.get("/admin/integration/wxwork-data")
async def api_get_wxwork(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get WeChat Work configuration."""
    data = configuration_service.get_integration_config(db, "Wxwork")
    return {"error_code": 0, "data": data}


@router.post("/admin/integration/wxwork")
async def api_save_wxwork(
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Save WeChat Work configuration."""
    body = await request.json()
    configuration_service.save_integration_config(db, body)
    return {"error_code": 0}


# ---------------------------------------------------------------------------
# API endpoints — Feishu
# ---------------------------------------------------------------------------

@router.get("/admin/integration/feishu-data")
async def api_get_feishu(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get Feishu configuration."""
    data = configuration_service.get_integration_config(db, "Feishu")
    return {"error_code": 0, "data": data}


@router.post("/admin/integration/feishu")
async def api_save_feishu(
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Save Feishu configuration."""
    body = await request.json()
    configuration_service.save_integration_config(db, body)
    return {"error_code": 0}


# ---------------------------------------------------------------------------
# API endpoints — AiBot
# ---------------------------------------------------------------------------

@router.get("/admin/integration/aibot-data")
async def api_get_aibot(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get AiBot configuration."""
    data = configuration_service.get_integration_config(db, "Aibot")
    return {"error_code": 0, "data": data}


@router.post("/admin/integration/aibot")
async def api_save_aibot(
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Save AiBot configuration."""
    body = await request.json()
    configuration_service.save_integration_config(db, body)
    return {"error_code": 0}


# ---------------------------------------------------------------------------
# API endpoints — Maintenance mode
# ---------------------------------------------------------------------------

@router.get("/admin/integration/maintenance-mode")
async def api_get_maintenance(
    current_user: User = Depends(require_admin),
):
    """Get current maintenance mode."""
    mm = configuration_service.get_maintenance_mode()
    return {"error_code": 0, "data": mm}


@router.post("/admin/integration/maintenance-mode")
async def api_set_maintenance(
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Set or cancel maintenance mode."""
    body = await request.json()
    action = body.get("action", "set")

    if action == "cancel":
        configuration_service.cancel_maintenance_mode()
        return {"error_code": 0, "data": "已取消"}

    start_time = body.get("startTime")
    end_time = body.get("endTime")
    note = body.get("note", "")
    not_login = body.get("notLogin", False)

    if start_time:
        start_time = datetime.fromisoformat(start_time) if isinstance(start_time, str) else start_time
    else:
        start_time = datetime.utcnow()

    if end_time:
        end_time = datetime.fromisoformat(end_time) if isinstance(end_time, str) else end_time
    else:
        return {"error_code": 400, "error_msg": "请指定维护结束时间"}

    result = configuration_service.set_maintenance_mode(start_time, end_time, note, not_login)
    return {"error_code": 0, "data": result}


# ---------------------------------------------------------------------------
# API endpoints — API Manager
# ---------------------------------------------------------------------------

@router.get("/admin/integration/apis-manager/app-list")
async def api_app_list(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """List all API apps."""
    data = apis_manager_service.list_apps(db)
    return {"error_code": 0, "data": data}


@router.post("/admin/integration/apis-manager/reset-secret")
async def api_reset_secret(
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Reset API app secret."""
    body = await request.json()
    app_id = body.get("appId", "")
    if not app_id:
        return {"error_code": 400, "error_msg": "缺少应用ID"}
    new_secret = apis_manager_service.reset_secret(db, app_id)
    if not new_secret:
        return {"error_code": 400, "error_msg": "应用不存在"}
    return {"error_code": 0, "data": {"appSecret": new_secret}}


@router.get("/admin/integration/apis-manager/request-times")
async def api_request_times(
    appids: str = None,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get request count and last request time for app IDs."""
    if not appids:
        return {"error_code": 400, "error_msg": "缺少应用ID"}
    data = apis_manager_service.get_request_times(db, appids)
    return {"error_code": 0, "data": data}


@router.get("/admin/integration/apis-manager/request-logs")
async def api_request_logs(
    appid: str = None,
    q: str = None,
    page_no: int = 1,
    page_size: int = 40,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get API request logs for an app."""
    if not appid:
        return {"error_code": 400, "error_msg": "缺少应用ID"}
    data = apis_manager_service.get_request_logs(db, appid, q, page_no, page_size)
    return {"error_code": 0, "data": data}
