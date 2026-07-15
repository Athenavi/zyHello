"""Admin setup routes — install wizard, RB system."""
from datetime import datetime

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_admin
from app.models import User
from app.template_deps import templates
from app.services import setup_service

router = APIRouter()


# ---------------------------------------------------------------------------
# Page routes
# ---------------------------------------------------------------------------

@router.get("/admin/setup/install")
async def install(request: Request):
    """Render install wizard page."""
    return templates.TemplateResponse(request, "admin/setup/install.html", {})


@router.get("/admin/setup/rbsystem")
async def rbsystem(
    request: Request,
    current_user: User = Depends(require_admin),
):
    """Render RB system configuration page."""
    return templates.TemplateResponse(request, "admin/setup/rbsystem.html", {
        "user": current_user,
    })


# ---------------------------------------------------------------------------
# API endpoints — install wizard
# ---------------------------------------------------------------------------

@router.get("/admin/setup/install-status")
async def api_install_status():
    """Check whether the system has already been installed."""
    result = setup_service.check_install_status()
    return {"error_code": 0, "data": result}


@router.post("/admin/setup/test-connection")
async def api_test_connection(
    request: Request,
    db: Session = Depends(get_db),
):
    """Test database connection with provided properties."""
    body = await request.json()
    result = setup_service.test_database_connection(body)
    return {"error_code": 0 if result.get("success") else 400, "data": result}


@router.post("/admin/setup/test-cache")
async def api_test_cache(
    request: Request,
    db: Session = Depends(get_db),
):
    """Test Redis cache connection."""
    body = await request.json()
    result = setup_service.test_cache_connection(body)
    return {"error_code": 0 if result.get("success") else 400, "data": result}


@router.post("/admin/setup/install-rebuild")
async def api_install_rebuild(
    request: Request,
    db: Session = Depends(get_db),
):
    """Execute initial installation — create tables, seed admin user."""
    body = await request.json()
    result = setup_service.install_rebuild(db, body)
    return {"error_code": 0 if result.get("success") else 400, "data": result}


@router.get("/admin/setup/request-sn")
async def api_request_sn(
    sn: str = None,
    db: Session = Depends(get_db),
):
    """Request or validate a serial number."""
    result = setup_service.request_sn(sn)
    return {"error_code": 0 if result.get("success") else 400, "data": result}


@router.post("/admin/setup/install-rbsystem")
async def api_install_rbsystem(
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Install/import an RB system definition file."""
    body = await request.json()
    file_name = body.get("file", "")
    result = setup_service.install_rbsystem(db, file_name)
    return {"error_code": 0 if result.get("success") else 400, "data": result}
