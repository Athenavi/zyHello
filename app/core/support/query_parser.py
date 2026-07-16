"""Query parsing — builds SQL from JSON query expressions.

Migrated from Java: com.rebuild.core.support.general.QueryParser,
com.rebuild.core.support.general.ProtocolFilterParser.
Parses JSON query expressions into SQL SELECT/WHERE/ORDER/LIMIT clauses.
"""
from __future__ import annotations

import json
import logging
import re
from datetime import datetime, timedelta
from typing import Any, Optional

from app.core.metadata import get_entity, list_fields, FieldMeta, EntityMeta

log = logging.getLogger(__name__)


# ── Date expression parsing ──────────────────────────────────────────────────

def parse_date_expr(expr: str, base: datetime | None = None) -> datetime | None:
    """Parse a date expression like 'NOW', 'NOW-7D', 'TODAY', 'THISMONTH' etc.
    
    Migrated from Java: FieldValueHelper.parseDateExpr
    """
    if not expr:
        return None
    
    base = base or datetime.utcnow()
    expr_upper = expr.upper().strip()
    
    if expr_upper == "NOW":
        return base
    if expr_upper == "TODAY":
        return base.replace(hour=0, minute=0, second=0, microsecond=0)
    if expr_upper == "YESTERDAY":
        return (base - timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    if expr_upper == "TOMORROW":
        return (base + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    if expr_upper == "THISWEEK":
        return base - timedelta(days=base.weekday())
    if expr_upper == "LASTWEEK":
        return base - timedelta(days=base.weekday() + 7)
    if expr_upper == "NEXTWEEK":
        return base - timedelta(days=base.weekday() - 7)
    if expr_upper == "THISMONTH":
        return base.replace(day=1)
    if expr_upper == "LASTMONTH":
        first_of_month = base.replace(day=1)
        return (first_of_month - timedelta(days=1)).replace(day=1)
    
    # Relative expressions: NOW+Nd, NOW-Nd, etc.
    match = re.match(r"NOW\s*([+-])\s*(\d+)\s*([HDMY])", expr_upper)
    if match:
        sign = 1 if match.group(1) == "+" else -1
        amount = int(match.group(2)) * sign
        unit = match.group(3)
        if unit == "H":
            return base + timedelta(hours=amount)
        elif unit == "D":
            return base + timedelta(days=amount)
        elif unit == "M":
            month = base.month + amount
            year = base.year + (month - 1) // 12
            month = ((month - 1) % 12) + 1
            return base.replace(year=year, month=month)
        elif unit == "Y":
            return base.replace(year=base.year + amount)
    
    # Try ISO format
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%d"):
        try:
            return datetime.strptime(expr, fmt)
        except ValueError:
            continue
    return None


# ── QueryParser ──────────────────────────────────────────────────────────────


class QueryParser:
    """Parses a JSON query expression into SQL clauses.
    
    Migrated from Java: com.rebuild.core.support.general.QueryParser
    
    Expected query format:
    {
        "entity": "Account",
        "fields": ["accountId", "accountName", ...],
        "where": [...],           # advanced filter items
        "sort": "fieldName:asc",
        "pageNo": 1,
        "pageSize": 20,
        "protocolFilter": "...",  # protocol-based filters
        "advFilter": "filter-id"  # saved adv filter ID
    }
    """
    
    def __init__(self, query_expr: dict, user_id: str | None = None):
        self._query = query_expr
        self._user_id = user_id
        self._entity_name = query_expr.get("entity", "")
        self._parsed = False
        
        # Parsed results
        self._fields: list[str] = []
        self._where_clause = "1=1"
        self._order_clause = ""
        self._limit = 20
        self._offset = 0
        self._join_fields: dict[str, int] = {}
        self._count_fields: list[dict] = []
    
    def to_sql(self) -> str:
        """Build the full SELECT SQL statement."""
        self._parse_if_needed()
        fields_str = ", ".join(self._fields) if self._fields else "*"
        sql = f"SELECT {fields_str} FROM entity_record"
        if self._where_clause and self._where_clause != "1=1":
            sql += f" WHERE {self._where_clause}"
        if self._order_clause:
            sql += f" ORDER BY {self._order_clause}"
        sql += f" LIMIT {self._limit} OFFSET {self._offset}"
        return sql
    
    def to_count_sql(self) -> str:
        """Build a COUNT SQL statement."""
        self._parse_if_needed()
        sql = "SELECT COUNT(*) FROM entity_record"
        if self._where_clause and self._where_clause != "1=1":
            sql += f" WHERE {self._where_clause}"
        return sql
    
    @property
    def query_fields(self) -> list[str]:
        """Get the list of queried field names."""
        self._parse_if_needed()
        return list(self._fields)
    
    @property
    def sql_limit(self) -> tuple[int, int]:
        """Get (limit, offset) tuple."""
        self._parse_if_needed()
        return (self._limit, self._offset)
    
    @property
    def join_fields(self) -> dict[str, int]:
        """Get fields that require JOINs (reference fields)."""
        self._parse_if_needed()
        return dict(self._join_fields)
    
    @property
    def count_fields(self) -> list[dict]:
        """Get fields used for statistics/counting."""
        self._parse_if_needed()
        return list(self._count_fields)
    
    def _parse_if_needed(self):
        if self._parsed:
            return
        self._parsed = True
        
        # Entity and fields
        fields = self._query.get("fields", [])
        if isinstance(fields, str):
            fields = [f.strip() for f in fields.split(",") if f.strip()]
        self._fields = fields
        
        # Filters
        self._where_clause = self._parse_filters()
        
        # Protocol filter
        protocol_filter = self._query.get("protocolFilter")
        if protocol_filter:
            pf_sql = self._parse_protocol_filter(protocol_filter)
            if pf_sql and pf_sql != "1=1":
                if self._where_clause == "1=1":
                    self._where_clause = pf_sql
                else:
                    self._where_clause = f"({self._where_clause}) AND ({pf_sql})"
        
        # Sort
        sort = self._query.get("sort", "")
        self._order_clause = self._parse_sort(sort) if sort else ""
        
        # Pagination
        page_no = max(1, int(self._query.get("pageNo", 1)))
        page_size = min(500, max(1, int(self._query.get("pageSize", 20))))
        self._limit = page_size
        self._offset = (page_no - 1) * page_size
    
    def _parse_filters(self) -> str:
        """Parse filter conditions from the query expression."""
        where = self._query.get("where")
        if not where:
            return "1=1"
        
        if isinstance(where, str):
            try:
                where = json.loads(where)
            except (json.JSONDecodeError, TypeError):
                return where
        
        items = where.get("items", []) if isinstance(where, dict) else []
        if not items:
            return "1=1"
        
        op_map = {
            "EQ": "=", "NEQ": "!=", "GT": ">", "LT": "<", "GTE": ">=", "LTE": "<=",
            "LK": "LIKE", "NLK": "NOT LIKE", "SW": "LIKE", "EW": "LIKE",
            "NLL": "IS NULL", "NLN": "IS NOT NULL",
            "BTW": "BETWEEN", "IN": "IN", "NIN": "NOT IN",
        }
        
        conditions = []
        for item in items:
            field = item.get("field", "")
            op = (item.get("op") or "EQ").upper()
            value = item.get("value")
            value_end = item.get("value2")  # for BETWEEN
            
            if not field:
                continue
            
            sql_op = op_map.get(op)
            if not sql_op:
                continue
            
            # NULL operators
            if op in ("NLL", "NLN"):
                conditions.append(f"{field} {sql_op}")
                continue
            
            # LIKE variants
            if op == "LK":
                conditions.append(f"{field} LIKE '%{self._escape_like(value)}%' ESCAPE '\\'")
                continue
            if op == "NLK":
                conditions.append(f"{field} NOT LIKE '%{self._escape_like(value)}%' ESCAPE '\\'")
                continue
            if op == "SW":
                conditions.append(f"{field} LIKE '{self._escape_like(value)}%' ESCAPE '\\'")
                continue
            if op == "EW":
                conditions.append(f"{field} LIKE '%{self._escape_like(value)}' ESCAPE '\\'")
                continue
            
            # BETWEEN
            if op == "BTW":
                if isinstance(value, list) and len(value) >= 2:
                    conditions.append(f"{field} BETWEEN '{self._escape(value[0])}' AND '{self._escape(value[1])}'")
                continue
            
            # IN / NOT IN
            if op in ("IN", "NIN"):
                if isinstance(value, list):
                    vals = ", ".join(f"'{self._escape(v)}'" for v in value)
                else:
                    vals = f"'{self._escape(value)}'"
                conditions.append(f"{field} {sql_op} ({vals})")
                continue
            
            # Date expressions
            if value and isinstance(value, str) and re.match(r"(NOW|TODAY|YESTERDAY|THISWEEK|THISMONTH)", value.upper()):
                dt = parse_date_expr(value)
                if dt:
                    value = dt.strftime("%Y-%m-%d %H:%M:%S")
            
            # Standard comparison
            if value is not None:
                conditions.append(f"{field} {sql_op} '{self._escape(value)}'")
        
        logic = where.get("logic", "AND").upper() if isinstance(where, dict) else "AND"
        joiner = " AND " if logic == "AND" else " OR "
        return joiner.join(conditions) if conditions else "1=1"
    
    def _parse_sort(self, sort: str) -> str:
        """Parse sort expression like 'fieldName:asc' or 'fieldName:desc'."""
        if not sort:
            return ""
        
        parts = sort.split(":")
        field = parts[0].strip()
        direction = parts[1].strip().upper() if len(parts) > 1 else "ASC"
        
        if not field:
            return ""
        
        direction = "DESC" if direction == "DESC" else "ASC"
        return f"{field} {direction}"
    
    def _parse_protocol_filter(self, pf_expr: str) -> str:
        """Parse protocol filter expressions."""
        if not pf_expr:
            return "1=1"
        parser = ProtocolFilterParser(pf_expr, self._entity_name, self._user_id)
        return parser.to_sql_where()
    
    @staticmethod
    def _escape(value: Any) -> str:
        """Escape a value for SQL string interpolation."""
        if value is None:
            return ""
        s = str(value)
        return s.replace("'", "''")

    @staticmethod
    def _escape_like(value: Any) -> str:
        """Escape a value for SQL LIKE, including wildcards."""
        s = QueryParser._escape(value)
        return s.replace("%", "\\%").replace("_", "\\_")


# ── ProtocolFilterParser ─────────────────────────────────────────────────────


class ProtocolFilterParser:
    """Parses protocol-based filter expressions into SQL WHERE clauses.
    
    Migrated from Java: com.rebuild.core.support.general.ProtocolFilterParser
    
    Supported protocols:
        - via:xxx    — records owned by a specific user/department
        - ref:xxx    — records referenced by another record
        - category:xxx — records in a classification category
        - related:xxx  — related records
        - ids:xxx      — specific record IDs
    """
    
    def __init__(self, expr: str, entity_name: str = "", user_id: str | None = None):
        self._expr = expr or ""
        self._entity_name = entity_name
        self._user_id = user_id
    
    def to_sql_where(self) -> str:
        """Parse the protocol expression and return a SQL WHERE clause."""
        if not self._expr:
            return "1=1"
        
        expr = self._expr.strip()
        
        if expr.startswith("via:"):
            return self._parse_via(expr[4:].strip())
        elif expr.startswith("ref:"):
            return self._parse_ref(expr[4:].strip())
        elif expr.startswith("category:"):
            return self._parse_category(expr[9:].strip())
        elif expr.startswith("related:"):
            return self._parse_related(expr[8:].strip())
        elif expr.startswith("ids:"):
            return self._parse_ids(expr[4:].strip())
        
        # Try parsing as multiple protocol expressions separated by AND/OR
        if " AND " in expr.upper():
            parts = re.split(r"\s+AND\s+", expr, flags=re.IGNORECASE)
            clauses = [ProtocolFilterParser(p, self._entity_name, self._user_id).to_sql_where() for p in parts]
            return " AND ".join(f"({c})" for c in clauses if c != "1=1") or "1=1"
        
        if " OR " in expr.upper():
            parts = re.split(r"\s+OR\s+", expr, flags=re.IGNORECASE)
            clauses = [ProtocolFilterParser(p, self._entity_name, self._user_id).to_sql_where() for p in parts]
            return " OR ".join(f"({c})" for c in clauses if c != "1=1") or "1=1"
        
        return "1=1"
    
    def _parse_via(self, via: str) -> str:
        """Parse 'via:xxx' — filter by owning user/department.
        
        'via:USER' — current user
        'via:DEPT' — current user's department
        'via:TEAM' — current user's teams
        'via:xxx'  — specific user/dept ID
        """
        if not via:
            return "1=1"
        
        if via == "USER":
            if self._user_id:
                return f"owning_user = '{self._user_id}'"
            return "1=1"
        
        if via == "DEPT":
            if self._user_id:
                # Would need to look up user's department; simplified
                return f"owning_dept IN (SELECT dept_id FROM user WHERE user_id = '{self._user_id}')"
            return "1=1"
        
        if via == "TEAM":
            if self._user_id:
                return f"owning_user IN (SELECT user_id FROM team_member WHERE team_id IN (SELECT team_id FROM team_member WHERE user_id = '{self._user_id}'))"
            return "1=1"
        
        # Specific ID
        return f"owning_user = '{via}'"
    
    def _parse_ref(self, content: str) -> str:
        """Parse 'ref:xxx' — records referenced by another record.
        
        Format: 'ref:entity.field=value' or 'ref:record_id'
        """
        if not content:
            return "1=1"
        
        # Format: entity.field=value
        if "=" in content:
            parts = content.split("=", 1)
            field_expr = parts[0].strip()
            value = parts[1].strip()
            
            if "." in field_expr:
                entity, field = field_expr.split(".", 1)
                return f"entity_name = '{entity}' AND JSON_EXTRACT(data, '$.{field}') = '{value}'"
            return f"JSON_EXTRACT(data, '$.{field_expr}') = '{value}'"
        
        # Format: record_id — find records that reference this ID
        return f"JSON_EXTRACT(data, '$.*') LIKE '%{content}%'"
    
    def _parse_category(self, value: str) -> str:
        """Parse 'category:xxx' — filter by classification category."""
        if not value:
            return "1=1"
        return f"JSON_EXTRACT(data, '$.categoryId') = '{value}'"
    
    def _parse_related(self, related_expr: str) -> str:
        """Parse 'related:entity.field=mainid' — related records."""
        if not related_expr:
            return "1=1"
        
        if "=" in related_expr:
            parts = related_expr.split("=", 1)
            field_expr = parts[0].strip()
            main_id = parts[1].strip()
            
            if "." in field_expr:
                entity, field = field_expr.split(".", 1)
                return f"entity_name = '{entity}' AND JSON_EXTRACT(data, '$.{field}') = '{main_id}'"
            return f"JSON_EXTRACT(data, '$.{field_expr}') = '{main_id}'"
        
        return "1=1"
    
    def _parse_ids(self, ids_expr: str) -> str:
        """Parse 'ids:xxx' — specific record IDs (comma-separated)."""
        if not ids_expr:
            return "1=1"
        
        ids = [id_.strip() for id_ in ids_expr.split(",") if id_.strip()]
        if not ids:
            return "1=1"
        
        id_list = ", ".join(f"'{id_}'" for id_ in ids)
        return f"record_id IN ({id_list})"
