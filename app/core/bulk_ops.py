"""Bulk CRUD operations.

Migrated from Java: BulkOperator, BulkAssign, BulkDelete, BulkShare,
BulkUnshare, BulkBatchUpdate, BulkContext, BulkBacthUpdate.
"""
from __future__ import annotations
import logging
from typing import Any, Optional
logger=logging.getLogger(__name__)
class BulkContext:
    """Context for a bulk operation."""
    def __init__(self, entity_name: str, record_ids: list[str],
                 operator_id: str, filter_data: dict | None = None):
        self.entity_name = entity_name
        self.record_ids = record_ids
        self.operator_id = operator_id
        self.filter_data = filter_data
class BulkResult:
    """Result of a bulk operation."""
    def __init__(self, affected: int = 0, errors: list[str] | None = None):
        self.affected = affected
        self.errors = errors or []
    def to_dict(self) -> dict:
        return {"affected": self.affected, "errors": self.errors}
class BulkOperator:
    """Base bulk operator."""
    def __init__(self, db):
        self._db = db
    def execute(self, ctx: BulkContext) -> BulkResult:
        raise NotImplementedError
class BulkAssign(BulkOperator):
    """Assign records to a user in bulk."""
    def __init__(self, db, assign_to: str):
        super().__init__(db)
        self._assign_to = assign_to
    def execute(self, ctx: BulkContext) -> BulkResult:
        from app.core.record import assign_record
        affected, errors = 0, []
        for rid in ctx.record_ids:
            try:
                assign_record(self._db, rid, self._assign_to, ctx.operator_id)
                affected += 1
            except Exception as e:
                errors.append(f"{rid}: {e}")
        return BulkResult(affected, errors)
class BulkDelete(BulkOperator):
    """Delete records in bulk."""
    def execute(self, ctx: BulkContext) -> BulkResult:
        from app.core.record import delete_record
        affected, errors = 0, []
        for rid in ctx.record_ids:
            try:
                delete_record(self._db, rid, ctx.operator_id)
                affected += 1
            except Exception as e:
                errors.append(f"{rid}: {e}")
        return BulkResult(affected, errors)
class BulkShare(BulkOperator):
    """Share records in bulk."""
    def __init__(self, db, share_to: str, rights: int = 2):
        super().__init__(db)
        self._share_to = share_to
        self._rights = rights
    def execute(self, ctx: BulkContext) -> BulkResult:
        from app.core.record import share_record
        affected, errors = 0, []
        for rid in ctx.record_ids:
            try:
                share_record(self._db, rid, self._share_to, self._rights, ctx.operator_id)
                affected += 1
            except Exception as e:
                errors.append(f"{rid}: {e}")
        return BulkResult(affected, errors)
class BulkUnshare(BulkOperator):
    """Unshare records in bulk."""
    def __init__(self, db, unshare_from: str):
        super().__init__(db)
        self._target = unshare_from
    def execute(self, ctx: BulkContext) -> BulkResult:
        from app.core.record import unshare_record
        affected, errors = 0, []
        for rid in ctx.record_ids:
            try:
                unshare_record(self._db, rid, self._target, ctx.operator_id)
                affected += 1
            except Exception as e:
                errors.append(f"{rid}: {e}")
        return BulkResult(affected, errors)
class BulkBatchUpdate(BulkOperator):
    """Batch-update field values across records."""
    def __init__(self, db, update_data: dict):
        super().__init__(db)
        self._data = update_data
    def execute(self, ctx: BulkContext) -> BulkResult:
        from app.core.record import save_record
        affected, errors = 0, []
        for rid in ctx.record_ids:
            try:
                payload = {**self._data}
                save_record(self._db, ctx.entity_name, payload, ctx.operator_id, rid)
                affected += 1
            except Exception as e:
                errors.append(f"{rid}: {e}")
        return BulkResult(affected, errors)
