"""Dashboard and chart service."""
import uuid
from typing import Optional

from sqlalchemy.orm import Session

from app.models import DashboardConfig, ChartConfig


def get_dashboards(db: Session, user_id: str) -> list[dict]:
    """Get available dashboards for a user."""
    dashboards = db.query(DashboardConfig).filter(
        DashboardConfig.created_by == user_id,
        DashboardConfig.is_disabled == False,
    ).order_by(DashboardConfig.modified_on.desc()).all()

    return [
        {
            "config_id": d.config_id,
            "title": d.title,
            "config": d.config,
            "modified_on": d.modified_on.isoformat() if d.modified_on else None,
        }
        for d in dashboards
    ]


def create_dashboard(db: Session, user_id: str, title: str, config: str = "[]") -> DashboardConfig:
    """Create a new dashboard."""
    dash = DashboardConfig(
        config_id=uuid.uuid4().hex[:20],
        title=title,
        config=config,
        created_by=user_id,
    )
    db.add(dash)
    db.commit()
    db.refresh(dash)
    return dash


def update_dashboard(db: Session, dashboard_id: str, user_id: str, config: str) -> Optional[str]:
    """Update dashboard config. Returns error or None."""
    dash = db.query(DashboardConfig).filter(
        DashboardConfig.config_id == dashboard_id,
        DashboardConfig.created_by == user_id,
    ).first()
    if not dash:
        return "Dashboard not found"
    dash.config = config
    db.commit()
    return None


def delete_dashboard(db: Session, dashboard_id: str, user_id: str) -> Optional[str]:
    """Delete a dashboard. Returns error or None."""
    dash = db.query(DashboardConfig).filter(
        DashboardConfig.config_id == dashboard_id,
        DashboardConfig.created_by == user_id,
    ).first()
    if not dash:
        return "Dashboard not found"
    db.delete(dash)
    db.commit()
    return None


def get_dashboard_by_id(db: Session, dashboard_id: str) -> Optional[DashboardConfig]:
    """Get a single dashboard by ID."""
    return db.query(DashboardConfig).filter(DashboardConfig.config_id == dashboard_id).first()


def get_chart_list(db: Session, user_id: str, entity: str = None, myself: bool = False) -> list[dict]:
    """Get chart list, optionally filtered by entity."""
    query = db.query(ChartConfig)
    if myself:
        query = query.filter(ChartConfig.created_by == user_id)
    if entity:
        query = query.filter(ChartConfig.belong_entity == entity)

    charts = query.order_by(ChartConfig.modified_on.desc()).all()
    return [
        {
            "chart_id": c.chart_id,
            "title": c.title,
            "chart_type": c.chart_type,
            "belong_entity": c.belong_entity,
            "config": c.config,
        }
        for c in charts
    ]


def create_chart(db: Session, user_id: str, title: str, chart_type: str,
                 belong_entity: str, config: str = "{}") -> ChartConfig:
    """Create a new chart."""
    chart = ChartConfig(
        chart_id=uuid.uuid4().hex[:20],
        title=title,
        chart_type=chart_type,
        belong_entity=belong_entity,
        config=config,
        created_by=user_id,
    )
    db.add(chart)
    db.commit()
    db.refresh(chart)
    return chart


def delete_chart(db: Session, chart_id: str, user_id: str) -> Optional[str]:
    """Delete a chart. Returns error or None."""
    chart = db.query(ChartConfig).filter(
        ChartConfig.chart_id == chart_id,
        ChartConfig.created_by == user_id,
    ).first()
    if not chart:
        return "Chart not found"
    db.delete(chart)
    db.commit()
    return None
