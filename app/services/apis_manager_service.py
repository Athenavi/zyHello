"""API manager service — manage RebuildApi apps, reset secrets, request logs."""
import uuid
import secrets
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from app.models import RebuildApi, RebuildApiRequest


def _gen_id() -> str:
    return uuid.uuid4().hex[:20]


def list_apps(db: Session) -> list[dict]:
    """List all API apps."""
    rows = db.query(RebuildApi).order_by(RebuildApi.created_on.desc()).all()
    result = []
    for r in rows:
        result.append({
            "id": r.unique_id,
            "appId": r.app_id,
            "appSecret": r.app_secret[:4] + "****",
            "bindUser": r.bind_user,
            "bindIps": r.bind_ips,
            "createdOn": r.created_on.strftime("%Y-%m-%d %H:%M") if r.created_on else "",
        })
    return result


def reset_secret(db: Session, app_id: str) -> Optional[str]:
    """Reset app secret. Returns new secret or None if not found."""
    app = db.query(RebuildApi).filter(RebuildApi.unique_id == app_id).first()
    if not app:
        return None
    new_secret = secrets.token_hex(20)
    app.app_secret = new_secret
    app.modified_on = datetime.utcnow()
    db.commit()
    return new_secret


def get_request_times(db: Session, app_ids: str) -> dict:
    """Get request count and last request time for given app IDs."""
    result = {}
    cutoff = datetime.utcnow() - timedelta(days=90)

    for app_id in app_ids.split(","):
        app_id = app_id.strip()
        if not app_id:
            continue

        count = db.query(RebuildApiRequest).filter(
            RebuildApiRequest.app_id == app_id,
            RebuildApiRequest.request_time > cutoff,
        ).count()

        last_req = db.query(RebuildApiRequest).filter(
            RebuildApiRequest.app_id == app_id,
            RebuildApiRequest.request_time > cutoff,
        ).order_by(RebuildApiRequest.request_time.desc()).first()

        result[app_id] = [
            count,
            last_req.request_time.strftime("%Y-%m-%d %H:%M") if last_req else None,
        ]

    return result


def get_request_logs(
    db: Session,
    app_id: str,
    q: str = None,
    page_no: int = 1,
    page_size: int = 40,
) -> list[dict]:
    """Get API request logs for an app."""
    cutoff = datetime.utcnow() - timedelta(days=90)
    query = db.query(RebuildApiRequest).filter(
        RebuildApiRequest.app_id == app_id,
        RebuildApiRequest.request_time > cutoff,
    )

    if q:
        like_q = f"%{q}%"
        query = query.filter(
            (RebuildApiRequest.request_body.like(like_q)) |
            (RebuildApiRequest.response_body.like(like_q))
        )

    offset = (page_no - 1) * page_size
    rows = query.order_by(RebuildApiRequest.request_time.desc()).offset(offset).limit(page_size).all()

    result = []
    for r in rows:
        result.append({
            "remoteIp": r.remote_ip,
            "requestTime": r.request_time.strftime("%Y-%m-%d %H:%M") if r.request_time else "",
            "responseTime": r.response_time.strftime("%Y-%m-%d %H:%M") if r.response_time else "",
            "requestUrl": r.request_url,
            "requestBody": r.request_body,
            "responseBody": r.response_body,
            "requestId": r.request_id,
        })

    return result


def create_api_app(db: Session, bind_user: str, bind_ips: str = None) -> dict:
    """Create a new API app."""
    app = RebuildApi(
        unique_id=_gen_id(),
        app_id=secrets.token_hex(16),
        app_secret=secrets.token_hex(20),
        bind_user=bind_user,
        bind_ips=bind_ips,
    )
    db.add(app)
    db.commit()
    return {
        "id": app.unique_id,
        "appId": app.app_id,
        "appSecret": app.app_secret,
    }
