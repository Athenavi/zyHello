"""Data list building — query execution, pagination, statistics.

Migrated from Java: com.rebuild.core.support.general.DataListBuilderImpl,
com.rebuild.core.support.general.DataListWrapper.
Builds paginated data list results with optional field statistics.
"""
from __future__ import annotations

import json
import logging
from typing import Any, Optional

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.metadata import get_entity, list_fields, FieldMeta, EntityMeta
from app.core.support.query_parser import QueryParser
from app.core.support.field_value_helper import wrap_field_value, get_label

log = logging.getLogger(__name__)


# ── DataListBuilder ──────────────────────────────────────────────────────────


class DataListBuilder:
    """Builds paginated data list results from a JSON query expression.
    
    Migrated from Java: com.rebuild.core.support.general.DataListBuilderImpl
    
    Usage:
        builder = DataListBuilder(query_expr, user_id="xxx")
        result = builder.build(db)
        # result = { "total": 100, "page_no": 1, "page_size": 20, "data": [...], "stats": {...} }
    """
    
    def __init__(self, query_expr: dict, user_id: str | None = None):
        self._query = query_expr
        self._user_id = user_id
        self._entity_name = query_expr.get("entity", "")
    
    def build(self, db: Session) -> dict:
        """Execute the query and return a paginated result set.
        
        Returns:
            {
                "total": int,
                "page_no": int,
                "page_size": int,
                "data": list[list],
                "fields": list[str],
                "stats": dict | None
            }
        """
        parser = QueryParser(self._query, self._user_id)
        
        # Execute count query
        count_sql = parser.to_count_sql()
        try:
            result = db.execute(text(count_sql)).fetchone()
            total_rows = result[0] if result else 0
        except Exception as e:
            log.warning(f"DataList count query failed: {e}")
            total_rows = 0
        
        # Execute data query
        data_sql = parser.to_sql()
        try:
            rows = db.execute(text(data_sql)).fetchall()
        except Exception as e:
            log.warning(f"DataList data query failed: {e}")
            rows = []
        
        # Get query fields
        query_fields = parser.query_fields
        if not query_fields:
            query_fields = ["record_id", "entity_name", "data"]
        
        # Build data array
        data = self._format_rows(rows, query_fields)
        
        # Get page info
        limit, offset = parser.sql_limit
        page_size = limit
        page_no = (offset // page_size) + 1 if page_size > 0 else 1
        
        # Get stats if requested
        stats = None
        count_fields = parser.count_fields
        if count_fields:
            stats = self._compute_stats(db, parser, count_fields)
        
        return {
            "total": total_rows,
            "page_no": page_no,
            "page_size": page_size,
            "data": data,
            "fields": query_fields,
            "stats": stats,
        }
    
    def _format_rows(self, rows: list, query_fields: list[str]) -> list[list]:
        """Format raw DB rows into the expected output format."""
        formatted = []
        for row in rows:
            row_data = []
            for i, field in enumerate(query_fields):
                value = row[i] if i < len(row) else None
                row_data.append(value)
            formatted.append(row_data)
        return formatted
    
    def _compute_stats(self, db: Session, parser: QueryParser,
                       count_fields: list[dict]) -> dict:
        """Compute statistics (SUM, AVG, MAX, MIN) for specified fields.
        
        count_fields format: [{"field": "amount", "calc": "SUM"}]
        """
        stats = {}
        where_clause = parser.to_count_sql().replace("SELECT COUNT(*)", "").strip()
        
        for cf in count_fields:
            field = cf.get("field", "")
            calc = (cf.get("calc") or "SUM").upper()
            
            if not field:
                continue
            
            # Validate calc type
            allowed_calcs = {"SUM", "AVG", "MAX", "MIN", "COUNT"}
            if calc not in allowed_calcs:
                calc = "SUM"
            
            # Build stats SQL on JSON data
            sql = f"SELECT {calc}(CAST(JSON_EXTRACT(data, '$.{field}') AS REAL)) FROM entity_record"
            
            # Add WHERE clause from the original query
            base_sql = where_clause
            if "WHERE" in base_sql:
                where_part = base_sql.split("WHERE", 1)[1].strip()
                if where_part:
                    sql += f" WHERE {where_part}"
            
            try:
                result = db.execute(text(sql)).fetchone()
                value = result[0] if result else 0
                stats[f"{field}:{calc}"] = round(float(value or 0), 2)
            except Exception as e:
                log.warning(f"Stats query failed for {field}:{calc}: {e}")
                stats[f"{field}:{calc}"] = 0
        
        return stats


# ── DataListWrapper ──────────────────────────────────────────────────────────


class DataListWrapper:
    """Wraps raw data list into a formatted JSON response.
    
    Migrated from Java: com.rebuild.core.support.general.DataListWrapper
    
    Handles:
    - Reference field label resolution
    - Picklist label resolution
    - Value formatting/wrapping
    - Pagination metadata
    """
    
    def __init__(self, entity_name: str, fields: list[str],
                 total_rows: int, data: list[list],
                 page_no: int = 1, page_size: int = 20):
        self._entity_name = entity_name
        self._fields = fields
        self._total = total_rows
        self._data = data
        self._page_no = page_no
        self._page_size = page_size
    
    def wrap(self, db: Session, user_id: str | None = None) -> dict:
        """Wrap the raw data into a formatted response.
        
        Returns the data with resolved labels and wrapped values.
        """
        # Get entity metadata for field type info
        entity_meta = get_entity(self._entity_name)
        field_metas: dict[str, FieldMeta] = {}
        if entity_meta:
            for fm in entity_meta.get_fields():
                field_metas[fm.name] = fm
        
        # Wrap each row
        wrapped_data = []
        for row in self._data:
            wrapped_row = []
            for i, value in enumerate(row):
                field_name = self._fields[i] if i < len(self._fields) else f"col{i}"
                fm = field_metas.get(field_name)
                wrapped_value = wrap_field_value(value, fm)
                wrapped_row.append(wrapped_value)
            wrapped_data.append(wrapped_row)
        
        return {
            "total": self._total,
            "page_no": self._page_no,
            "page_size": self._page_size,
            "data": wrapped_data,
            "fields": self._fields,
        }
    
    @staticmethod
    def from_builder_result(result: dict, entity_name: str,
                            db: Session, user_id: str | None = None) -> dict:
        """Convenience method: create a DataListWrapper from DataListBuilder.build() result."""
        wrapper = DataListWrapper(
            entity_name=entity_name,
            fields=result.get("fields", []),
            total_rows=result.get("total", 0),
            data=result.get("data", []),
            page_no=result.get("page_no", 1),
            page_size=result.get("page_size", 20),
        )
        return wrapper.wrap(db, user_id)


# ── Convenience functions ────────────────────────────────────────────────────


def build_data_list(db: Session, query_expr: dict,
                    user_id: str | None = None,
                    wrap_values: bool = True) -> dict:
    """Build a data list from a JSON query expression.
    
    High-level convenience function combining QueryParser + DataListBuilder + DataListWrapper.
    
    Args:
        db: Database session
        query_expr: JSON query expression with entity, fields, where, sort, pageNo, pageSize
        user_id: Current user ID (for permission-aware queries)
        wrap_values: Whether to wrap values (resolve references, format dates, etc.)
    
    Returns:
        Formatted data list with pagination info
    """
    builder = DataListBuilder(query_expr, user_id)
    result = builder.build(db)
    
    if wrap_values:
        entity_name = query_expr.get("entity", "")
        return DataListWrapper.from_builder_result(result, entity_name, db, user_id)
    
    return result


def get_json_stats(db: Session, query_expr: dict,
                   count_fields: list[dict]) -> dict:
    """Get statistics for specified fields.
    
    Args:
        db: Database session
        query_expr: JSON query expression (for WHERE clause)
        count_fields: List of { "field": "fieldName", "calc": "SUM|AVG|MAX|MIN" }
    
    Returns:
        Dictionary of { "field:calc": value }
    """
    builder = DataListBuilder(query_expr)
    parser = QueryParser(query_expr)
    return builder._compute_stats(db, parser, count_fields)
