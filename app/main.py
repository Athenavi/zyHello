import sys
from pathlib import Path

# Ensure project root is on sys.path so absolute imports work
# when running this file directly: python app/main.py
_project_root = str(Path(__file__).resolve().parent.parent)
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.config import settings
from app.logger import logger
from app.router import router
from app.api.gateway import router as api_gateway_router
from app.router.websocket import router as websocket_router

app = FastAPI(title=settings.PROJECT_NAME, version="0.1.0")

# ── CORS middleware for Next.js frontend ────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",   # Next.js dev server
        "http://localhost:3001",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# Include routers
app.include_router(router)
app.include_router(api_gateway_router)

# WebSocket router (no prefix — uses /ws path directly)
app.include_router(websocket_router)


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.get("/api/health")
async def api_health_check():
    """API-only health check for frontend."""
    return {"status": "ok", "version": "0.1.0"}


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error: {exc}")
    return JSONResponse(status_code=500, content={"detail": "Internal Server Error"})


@app.on_event("startup")
async def startup_event():
    """Load entity metadata from DB into memory on startup."""
    from app.database import SessionLocal, engine
    from app.models import Base
    from app.core.metadata import reload_metadata

    # Ensure all tables exist (safe no-op if already created)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        reload_metadata(db)
    except Exception as exc:
        logger.warning(f"Failed to load metadata at startup: {exc}")
    finally:
        db.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
