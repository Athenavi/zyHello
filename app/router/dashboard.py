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

# Chart engine imports
from app.core.charts import ChartsFactory, ChartData, ChartType, BaseChart

router = APIRouter()


def _chart_data_to_rows(chart_data: ChartData) -> list[dict]:
    """Convert a ChartData object to a flat rows array for the frontend.

    The frontend expects an array of objects like:
        [{"label": "X", "value": 100}, {"label": "Y", "value": 200}]

    For BAR/LINE charts, ChartData has .labels + .datasets.
    For PIE/FUNNEL charts, ChartData has .data = [{name, value}, ...].
    For INDEX charts, ChartData has .data = [{value: N}].
    For TABLE charts, ChartData has .data = [{col1: v1, col2: v2}, ...].
    For RADAR charts, ChartData has .data = [{indicator, value}].
    """
    rows = []

    # Case 1: ChartData has labels + datasets (BAR, LINE, PARETO)
    if chart_data.labels and chart_data.datasets:
        for i, label in enumerate(chart_data.labels):
            row = {"label": label}
            for ds in chart_data.datasets:
                values = ds.get("data", [])
                val = values[i] if i < len(values) else 0
                row[ds.get("label", "value")] = val
            rows.append(row)
        return rows

    # Case 2: ChartData has .data with {name, value} entries (PIE, FUNNEL, TREEMAP)
    if chart_data.data and isinstance(chart_data.data[0], dict):
        first = chart_data.data[0]
        if "name" in first and "value" in first:
            # PIE-style data
            for item in chart_data.data:
                rows.append({"label": item.get("name", ""), "value": item.get("value", 0)})
            return rows
        # TABLE-style: raw column data
        return [dict(item) for item in chart_data.data]

    return rows


def _build_chart_rows(db: Session, user_id: str, chart) -> list[dict]:
    """Build chart data rows using the ChartsFactory engine.

    Falls back gracefully to empty list on any error.
    """
    import json
    from app.core.metadata import get_entity

    try:
        cfg = json.loads(chart.config) if chart.config else {}
        spec = ChartsFactory.parse_spec(cfg)
        # Override entity and chart type from the chart record
        entity_name = chart.belong_entity or spec.entity
        # Resolve entity name to physical table name via metadata registry
        entity_meta = get_entity(entity_name) if entity_name else None
        if entity_meta and entity_meta.physical_name:
            spec.entity = entity_meta.physical_name
        else:
            spec.entity = entity_name.lower() if entity_name else entity_name
        spec.chart_type = ChartType(chart.chart_type) if chart.chart_type else spec.chart_type
        chart_instance = ChartsFactory.create(spec)
        chart_data = chart_instance.build_data(db, user_id)
        return _chart_data_to_rows(chart_data)
    except Exception as e:
        logger = __import__("logging").getLogger(__name__)
        logger.warning("Chart data build failed for %s: %s", chart.chart_id, e)
        return []


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
    rows = _build_chart_rows(db, current_user.user_id, chart)
    return {
        "ok": True,
        "data": {
            "chart_id": chart.chart_id,
            "title": chart.title,
            "chart_type": chart.chart_type,
            "rows": rows,
        },
    }


@router.get("/dashboard/chart/data/{chartId}")
async def chart_data(
    chartId: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get chart data for rendering.

    Uses the ChartsFactory engine to build real data from chart config.
    """
    from app.models import ChartConfig
    chart = db.query(ChartConfig).filter(ChartConfig.chart_id == chartId).first()
    if not chart:
        raise HTTPException(status_code=404, detail="Chart not found")
    import json
    cfg = json.loads(chart.config) if chart.config else {}
    rows = _build_chart_rows(db, current_user.user_id, chart)
    return {
        "ok": True,
        "data": {
            "chart_id": chart.chart_id,
            "title": chart.title,
            "chart_type": chart.chart_type,
            "belong_entity": chart.belong_entity,
            "config": cfg,
            "rows": rows,
        },
    }


@router.post("/dashboard/chart/preview")
async def chart_preview(
    body: ChartPreviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Preview chart data before saving."""
    # Build preview data from the request config
    import json
    from app.core.metadata import get_entity

    try:
        cfg = json.loads(body.config) if body.config else {}
        spec = ChartsFactory.parse_spec(cfg)
        entity_name = body.belong_entity or spec.entity
        entity_meta = get_entity(entity_name) if entity_name else None
        if entity_meta and entity_meta.physical_name:
            spec.entity = entity_meta.physical_name
        else:
            spec.entity = entity_name.lower() if entity_name else entity_name
        spec.chart_type = ChartType(body.chart_type) if body.chart_type else spec.chart_type
        chart_instance = ChartsFactory.create(spec)
        chart_data = chart_instance.build_data(db, current_user.user_id)
        rows = _chart_data_to_rows(chart_data)
    except Exception as e:
        logger = __import__("logging").getLogger(__name__)
        logger.warning("Chart preview failed: %s", e)
        rows = []
    return {
        "ok": True,
        "data": {
            "chart_type": body.chart_type,
            "belong_entity": body.belong_entity,
            "rows": rows,
        },
    }
