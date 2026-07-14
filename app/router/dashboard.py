"""Dashboard and chart routes — CRUD dashboards, chart management."""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas.dashboard import (
    DashboardCreateRequest,
    DashboardUpdateRequest,
    DashboardDeleteRequest,
    ChartCreateRequest,
    ChartDeleteRequest,
    ChartPreviewRequest,
)
from app.services import dashboard_service
from app.template_deps import templates
from app.models import User, ProjectTask
from sqlalchemy import func

router = APIRouter()


# ── Dashboard routes (DashboardController) ──────────────────────────


@router.get("/dashboard/home")
async def page_home(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Render dashboard home page."""
    return templates.TemplateResponse(request, "dashboard/home.html", {
        "user": current_user,
    })


@router.post("/dashboard/save")
async def save_dashboard(
    body: DashboardUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update dashboard config."""
    error = dashboard_service.update_dashboard(db, body.dashboard_id, current_user.user_id, body.config)
    if error:
        raise HTTPException(status_code=400, detail=error)
    return {"ok": True}


@router.post("/dashboard/delete")
async def delete_dashboard(
    body: DashboardDeleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a dashboard."""
    error = dashboard_service.delete_dashboard(db, body.dashboard_id, current_user.user_id)
    if error:
        raise HTTPException(status_code=400, detail=error)
    return {"ok": True}


@router.get("/dashboard/list")
async def list_dashboards(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all dashboards for the current user."""
    data = dashboard_service.get_dashboards(db, current_user.user_id)
    return {"ok": True, "data": data}


@router.get("/dashboard/dash-gets")
async def dash_gets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get dashboards for the current user (legacy endpoint)."""
    data = dashboard_service.get_dashboards(db, current_user.user_id)
    return {"ok": True, "data": data}


@router.get("/dashboard/stats")
async def dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get dashboard statistics (record counts, user counts, etc.)."""
    from app.models import User as UserModel, ProjectTask, Notification

    total_users = db.query(func.count(UserModel.user_id)).filter(
        UserModel.is_disabled == False
    ).scalar() or 0

    total_tasks = db.query(func.count(ProjectTask.task_id)).filter(
        ProjectTask.is_deleted == False
    ).scalar() or 0

    pending_tasks = db.query(func.count(ProjectTask.task_id)).filter(
        ProjectTask.is_deleted == False,
        ProjectTask.status == 0,
    ).scalar() or 0

    unread_notifications = db.query(func.count(Notification.message_id)).filter(
        Notification.to_user == current_user.user_id,
        Notification.unread == True,
    ).scalar() or 0

    return {
        "error_code": 0,
        "data": {
            "total_users": total_users,
            "total_tasks": total_tasks,
            "pending_tasks": pending_tasks,
            "unread_notifications": unread_notifications,
        },
    }


@router.get("/dashboard/chart-list")
async def chart_list(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all charts for the current user."""
    data = dashboard_service.get_chart_list(db, current_user.user_id, myself=True)
    return {"ok": True, "data": data}


@router.get("/dashboard/{dashboardId}")
async def get_dashboard(
    dashboardId: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific dashboard."""
    dash = dashboard_service.get_dashboard_by_id(db, dashboardId)
    if not dash:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    return {
        "ok": True,
        "data": {
            "config_id": dash.config_id,
            "title": dash.title,
            "config": dash.config,
            "modified_on": dash.modified_on.isoformat() if dash.modified_on else None,
        },
    }


# ── Chart Design routes (ChartDesignController) ─────────────────────


@router.get("/dashboard/chart/design/{chartId}")
async def chart_design(
    chartId: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Render chart design page."""
    return templates.TemplateResponse(request, "dashboard/chart-design.html", {
        "user": current_user,
        "chartId": chartId,
    })


@router.post("/dashboard/chart-create")
async def create_chart_compat(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new chart (frontend-compatible endpoint)."""
    body = await request.json()
    title = body.get("title", "")
    chart_type = body.get("type") or body.get("chart_type", "LINE")
    belong_entity = body.get("belong_entity", "")
    config = body.get("config", "{}")
    chart = dashboard_service.create_chart(
        db, current_user.user_id, title, chart_type, belong_entity, config,
    )
    return {"ok": True, "data": {"chart_id": chart.chart_id}}


@router.post("/dashboard/chart/save")
async def save_chart(
    body: ChartCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new chart."""
    chart = dashboard_service.create_chart(
        db, current_user.user_id, body.title, body.chart_type, body.belong_entity, body.config,
    )
    return {"ok": True, "data": {"chart_id": chart.chart_id}}


@router.post("/dashboard/chart/delete")
async def delete_chart(
    body: ChartDeleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a chart."""
    error = dashboard_service.delete_chart(db, body.chart_id, current_user.user_id)
    if error:
        raise HTTPException(status_code=400, detail=error)
    return {"ok": True}


# ── Chart Data routes (ChartDataController) ─────────────────────────


@router.get("/dashboard/chart-data")
async def chart_data_compat(
    id: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get chart data for rendering (frontend-compatible endpoint)."""
    from app.models import ChartConfig
    chart = db.query(ChartConfig).filter(ChartConfig.chart_id == id).first()
    if not chart:
        raise HTTPException(status_code=404, detail="Chart not found")
    return {
        "ok": True,
        "data": {
            "chart_id": chart.chart_id,
            "title": chart.title,
            "chart_type": chart.chart_type,
            "rows": [],
        },
    }


@router.get("/dashboard/chart/data/{chartId}")
async def chart_data(
    chartId: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get chart data for rendering."""
    from app.models import ChartConfig
    chart = db.query(ChartConfig).filter(ChartConfig.chart_id == chartId).first()
    if not chart:
        raise HTTPException(status_code=404, detail="Chart not found")
    # In production: execute chart query against entity data
    return {
        "ok": True,
        "data": {
            "chart_id": chart.chart_id,
            "title": chart.title,
            "chart_type": chart.chart_type,
            "rows": [],  # populated by chart engine
        },
    }


@router.post("/dashboard/chart/preview")
async def chart_preview(
    body: ChartPreviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Preview chart data before saving."""
    # In production: execute chart query against entity data
    return {
        "ok": True,
        "data": {
            "chart_type": body.chart_type,
            "belong_entity": body.belong_entity,
            "rows": [],
        },
    }
