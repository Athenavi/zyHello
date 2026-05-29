"""Error routes."""
from fastapi import APIRouter, Request
from app.template_deps import templates

router = APIRouter()


@router.get("/error/error")
async def error_page(request: Request):
    """Render error page."""
    return templates.TemplateResponse(request, "error/error.html", {})


@router.get("/error/server-status")
async def server_status(request: Request):
    """Render server status page."""
    return templates.TemplateResponse(request, "error/server-status.html", {})
