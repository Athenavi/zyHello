"""Dashboard request/response schemas."""
from pydantic import BaseModel
from typing import Optional


class DashboardCreateRequest(BaseModel):
    title: str
    config: Optional[str] = "[]"


class DashboardUpdateRequest(BaseModel):
    dashboard_id: str
    config: str


class DashboardDeleteRequest(BaseModel):
    dashboard_id: str


class ChartCreateRequest(BaseModel):
    title: str
    chart_type: str
    belong_entity: str
    config: Optional[str] = "{}"


class ChartDeleteRequest(BaseModel):
    chart_id: str


class ChartPreviewRequest(BaseModel):
    chart_type: str
    belong_entity: str
    config: Optional[str] = "{}"
