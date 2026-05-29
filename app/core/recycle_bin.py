"""Soft delete with recycle bin and restore.
Migrated from Java: RecycleStore, RecycleRestore, RecycleBinCleanerJob.
"""
from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timedelta
from typing import Any, Optional

from sqlalchemy.orm import Session
from sqlalchemy import text

logger = logging.getLogger(__name__)

DEFAULT_RETENTION_DAYS = 90


def _ensure_table(db: Session) -> None:
    """Create recycle_bin table if not exists."""
    db.execute(text(
        "CREATE TABLE IF NOT EXISTS recycle_bin ("
        "recycle_id TEXT PRIMARY KEY, "
        "record_id TEXT NOT NULL, "
        "record_data TEXT, "
        "deleted_by TEXT, "
        "deleted_on TIMESTAMP, "
        "channel TEXT, "
        "channel_with TEXT, "
        "belongs_entity TEXT, "
        "record_name TEXT)"
    ))
    db.commit()


def store_deleted_record(
    db: Session,
    record_id: str,
    entity_name: str,
    record_data: dict,
    deleted_by: str,
    channel: str = "USER",
    channel_with: str = None,
) -> str:
    """Store a deleted record's data in the recycle bin for later restore."""
    _ensure_table(db)
    rid = uuid.uuid4().hex
    record_name = record_data.get("name", "") or record_data.get("Name", "")
    if not record_name:
        record_name = f"[{record_id}]"

    db.execute(text(
        "INSERT INTO recycle_bin "
        "(recycle_id, record_id, record_data, deleted_by, deleted_on, channel, channel_with, belongs_entity, record_name) "
        "VALUES (:rid, :rid2, :rd, :db, :do, :ch, :cw, :be, :rn)"
    ), {
        "rid": rid,
        "rid2": record_id,
        "rd": json.dumps(record_data, default=str),
        "db": deleted_by,
        "do": datetime.utcnow(),
        "ch": channel,
        "cw": channel_with,
        "be": entity_name,
        "rn": record_name,
    })
    db.commit()
    logger.info("Stored deleted record %s/%s in recycle bin as %s", entity_name, record_id, rid)
    return rid


def list_recycled(
    db: Session,
    entity_name: str = None,
    deleted_by: str = None,
    page: int = 1,
    page_size: int = 20,
) -> dict:
    """List deleted records from the recycle bin with optional filters."""
    _ensure_table(db)
    where = ["1=1"]
    params: dict = {}
    if entity_name:
        where.append("belongs_entity = :e")
        params["e"] = entity_name
    if deleted_by:
        where.append("deleted_by = :d")
        params["d"] = deleted_by

    w = " AND ".join(where)
    offset = (page - 1) * page_size
    params["lim"] = page_size
    params["off"] = offset

    rows = db.execute(text(
        f"SELECT * FROM recycle_bin WHERE {w} ORDER BY deleted_on DESC LIMIT :lim OFFSET :off"
    ), params).fetchall()

    total = db.execute(text(
        f"SELECT COUNT(*) FROM recycle_bin WHERE {w}"
    ), {k: v for k, v in params.items() if k not in ("lim", "off")}).scalar() or 0

    items = []
    for r in rows:
        d = dict(r._mapping)
        try:
            d["record_data"] = json.loads(d.get("record_data", "{}"))
        except (json.JSONDecodeError, TypeError):
            d["record_data"] = {}
        items.append(d)

    return {"items": items, "total": total, "page": page, "page_size": page_size}


def restore_record(db: Session, recycle_id: str, cascade: bool = True) -> int:
    """Restore one or more records from the recycle bin.

    Reads the stored record_data JSON, extracts columns and values,
    and re-inserts them into the original entity table.

    Args:
        db: SQLAlchemy session
        recycle_id: The recycle_bin.recycle_id to restore
        cascade: If True, also restore records deleted as a cascade (channel_with)

    Returns:
        Number of records restored.
    """
    _ensure_table(db)
    row = db.execute(text(
        "SELECT record_data, record_id, recycle_id, belongs_entity "
        "FROM recycle_bin WHERE recycle_id = :r"
    ), {"r": recycle_id}).fetchone()

    if not row:
        logger.warning("Recycle record not found: %s", recycle_id)
        return 0

    recycle_ids_to_delete = [row.recycle_id]
    records_to_restore = []

    try:
        data = json.loads(row.record_data) if row.record_data else {}
        records_to_restore.append((row.belongs_entity, row.record_id, data))
    except (json.JSONDecodeError, TypeError) as e:
        logger.error("Failed to parse recycle data for %s: %s", recycle_id, e)

    if cascade:
        children = db.execute(text(
            "SELECT record_data, record_id, recycle_id, belongs_entity "
            "FROM recycle_bin WHERE channel_with = :r"
        ), {"r": row.record_id}).fetchall()

        for c in children:
            try:
                cdata = json.loads(c.record_data) if c.record_data else {}
                records_to_restore.append((c.belongs_entity, c.record_id, cdata))
                recycle_ids_to_delete.append(c.recycle_id)
            except (json.JSONDecodeError, TypeError) as e:
                logger.error("Failed to parse cascade recycle data for %s: %s", c.recycle_id, e)

    restored = 0
    for entity_name, record_id, data in records_to_restore:
        try:
            # Filter out internal/system columns that might not exist in the table
            skip_keys = {"__entity", "__id"}
            cols = {k: v for k, v in data.items() if k not in skip_keys and v is not None}
            if not cols:
                continue

            # Use INSERT OR REPLACE for SQLite compatibility
            col_names = ", ".join([f'"{k}"' for k in cols.keys()])
            placeholders = ", ".join([f":{k}" for k in cols.keys()])
            db.execute(text(
                f'INSERT OR REPLACE INTO "{entity_name}" ({col_names}) VALUES ({placeholders})'
            ), cols)
            restored += 1
            logger.info("Restored %s/%s from recycle bin", entity_name, record_id)
        except Exception as e:
            logger.warning("Failed to restore %s/%s: %s", entity_name, record_id, e)

    # Delete recycle bin entries for restored records
    if recycle_ids_to_delete:
        ph = ", ".join([f":rid{i}" for i in range(len(recycle_ids_to_delete))])
        pid = {f"rid{i}": v for i, v in enumerate(recycle_ids_to_delete)}
        db.execute(text(f"DELETE FROM recycle_bin WHERE recycle_id IN ({ph})"), pid)
        db.commit()

    return restored


def clean_expired(db: Session, retention_days: int = None) -> int:
    """Delete recycle bin records older than the retention period.

    Args:
        db: SQLAlchemy session
        retention_days: Days to keep (defaults to DEFAULT_RETENTION_DAYS)

    Returns:
        Number of records cleaned up.
    """
    if retention_days is None:
        retention_days = DEFAULT_RETENTION_DAYS
    _ensure_table(db)

    cutoff = datetime.utcnow() - timedelta(days=retention_days)
    result = db.execute(text("DELETE FROM recycle_bin WHERE deleted_on < :c"), {"c": cutoff})
    db.commit()
    count = result.rowcount
    logger.info("Cleaned %d expired recycle-bin records older than %d days", count, retention_days)
    return count


def purge_entity(db: Session, entity_name: str) -> int:
    """Permanently delete all recycle bin records for a specific entity.

    Args:
        db: SQLAlchemy session
        entity_name: Entity whose recycle bin records to purge

    Returns:
        Number of records purged.
    """
    _ensure_table(db)
    result = db.execute(text(
        "DELETE FROM recycle_bin WHERE belongs_entity = :e"
    ), {"e": entity_name})
    db.commit()
    count = result.rowcount
    logger.info("Purged %d recycle-bin records for entity %s", count, entity_name)
    return count
