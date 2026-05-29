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
