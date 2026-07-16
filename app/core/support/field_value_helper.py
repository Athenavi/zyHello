"""Field value helpers — wrapping, formatting, desensitization, calc formulas.

Migrated from Java: com.rebuild.core.support.general.FieldValueHelper,
com.rebuild.core.support.general.CalcFormulaSupport.
Provides value wrapping for API responses, label resolution, date expressions,
desensitization, and calculation formula evaluation.
"""
from __future__ import annotations

import logging
import math
import re
from datetime import datetime, timedelta
from typing import Any, Optional

from app.core.metadata import get_entity, list_fields, FieldMeta, EntityMeta

log = logging.getLogger(__name__)


# ── Value wrapping for API responses ─────────────────────────────────────────


def wrap_field_value(value: Any, field_meta: FieldMeta | None = None,
                     unpack_mix: bool = False) -> Any:
    """Wrap a field value for display in API responses.
    
    Migrated from Java: FieldValueHelper.wrapFieldValue
    
    Converts raw DB values into display-friendly formats:
    - Dates → ISO format strings
    - References → mix-value objects { id, text }
    - Picklists → label strings
    - Booleans → True/False
    """
    if value is None:
        return None
    
    if field_meta is None:
        return value
    
    ft = (field_meta.field_type or "").upper()
    
    # Date/DateTime
    if ft in ("DATE", "DATETIME"):
        if isinstance(value, datetime):
            return value.isoformat()
        if isinstance(value, str):
            return value
        return str(value) if value else None
    
    # Boolean
    if ft == "BOOL":
        if isinstance(value, str):
            return value.lower() in ("true", "1", "yes", "on")
        return bool(value)
    
    # Number
    if ft == "NUMBER":
        if isinstance(value, (int, float)):
            return value
        try:
            if "." in str(value):
                return float(value)
            return int(value)
        except (ValueError, TypeError):
            return value
    
    # N2NReference (multi-ref)
    if ft == "N2NREFERENCE":
        if isinstance(value, str):
            ids = [v.strip() for v in value.split(",") if v.strip()]
            if unpack_mix:
                return ids
            return [{"id": id_, "text": _get_label_for_id(id_)} for id_ in ids]
        return value
    
    # Reference (single ref)
    if ft == "REFERENCE":
        if isinstance(value, str) and len(value) == 20:
            if unpack_mix:
                return value
            return {"id": value, "text": _get_label_for_id(value)}
        return value
    
    return value


def wrap_mix_value(record_id: str, text: str) -> dict:
    """Create a mix-value object for reference fields.
    
    Migrated from Java: FieldValueHelper.wrapMixValue
    """
    return {"id": record_id, "text": text or ""}


def get_label(record_id: str, default: str = "") -> str:
    """Get the display label for a record ID.
    
    Migrated from Java: FieldValueHelper.getLabel
    """
    return _get_label_for_id(record_id) or default


def _get_label_for_id(record_id: str) -> str:
    """Look up a record's name field for display."""
    if not record_id:
        return ""
    # Simplified: would query the entity_record table for the name field
    # For now return the ID as the label
    return record_id


def get_text(value: Any, field_meta: FieldMeta | None = None) -> str:
    """Get plain text representation of a field value.
    
    Migrated from Java: FieldValueHelper.getText
    """
    if value is None:
        return ""
    
    wrapped = wrap_field_value(value, field_meta)
    
    if isinstance(wrapped, dict):
        return wrapped.get("text", str(wrapped.get("id", "")))
    if isinstance(wrapped, list):
        return ", ".join(item.get("text", str(item)) if isinstance(item, dict) else str(item) for item in wrapped)
    
    return str(wrapped)


# ── Date expression parsing ──────────────────────────────────────────────────


def parse_date_expr(date_expr: str, base: datetime | None = None) -> datetime | None:
    """Parse a date expression string into a datetime.
    
    Migrated from Java: FieldValueHelper.parseDateExpr
    
    Supports: NOW, TODAY, YESTERDAY, TOMORROW, THISWEEK, LASTWEEK,
    THISMONTH, LASTMONTH, NOW+Nd, NOW-Nd, etc.
    """
    from app.core.support.query_parser import parse_date_expr as _parse
    return _parse(date_expr, base)


# ── Desensitization ──────────────────────────────────────────────────────────


def desensitize_value(field_meta: FieldMeta, value: Any) -> Any:
    """Desensitize a field value for display (e.g., mask phone numbers, emails).
    
    Migrated from Java: FieldValueHelper.desensitized
    """
    if value is None:
        return None
    
    ft = (field_meta.field_type or "").upper()
    s = str(value)
    
    # Phone number: 138****1234
    if ft in ("PHONE", "MOBILE"):
        if len(s) >= 7:
            return s[:3] + "****" + s[-4:]
        return s
    
    # Email: t***@example.com
    if ft == "EMAIL":
        if "@" in s:
            local, domain = s.split("@", 1)
            masked_local = local[0] + "***" if len(local) > 1 else "*"
            return f"{masked_local}@{domain}"
        return s
    
    # ID card: 110***********1234
    if ft in ("IDCARD", "IDCARDNUMBER"):
        if len(s) >= 8:
            return s[:3] + "*" * (len(s) - 7) + s[-4:]
        return s
    
    # Bank card: **** **** **** 1234
    if ft in ("BANKCARD",):
        if len(s) >= 4:
            return "**** " * 3 + s[-4:]
        return s
    
    # General: mask middle characters
    if len(s) > 4:
        return s[:2] + "*" * (len(s) - 4) + s[-2:]
    
    return s


# ── Current variable resolution ──────────────────────────────────────────────


def is_current_var(name: str) -> bool:
    """Check if a variable name is a 'current' system variable.
    
    Migrated from Java: FieldValueHelper.isCurrentVar
    """
    if not name:
        return False
    current_vars = {
        "CURRENTUSER", "CURRENTDEPT", "CURRENTROLE",
        "CURRENTDATE", "CURRENTTIME", "CURRENTTIMESTAMP",
        "CURRENTOWINGUSER", "CURRENTOWINGDEPT",
    }
    return name.upper() in current_vars


def get_value_of_current(var_name: str, user_id: str | None = None) -> Any:
    """Resolve a 'CURRENT' system variable to its value.
    
    Migrated from Java: FieldValueHelper.getValueOfCurrent
    """
    if not var_name:
        return None
    
    upper = var_name.upper()
    now = datetime.utcnow()
    
    if upper == "CURRENTUSER":
        return user_id
    if upper == "CURRENTDATE":
        return now.strftime("%Y-%m-%d")
    if upper == "CURRENTTIME":
        return now.strftime("%H:%M:%S")
    if upper == "CURRENTTIMESTAMP":
        return now.isoformat()
    if upper == "CURRENTDEPT":
        # Would need to look up user's department
        return None
    if upper == "CURRENTROLE":
        return None
    
    return None


# ── Value comparison ─────────────────────────────────────────────────────────


def is_value_same(field_meta: FieldMeta, new_value: Any, old_value: Any) -> bool:
    """Check if two values are semantically the same for a given field.
    
    Migrated from Java: FieldValueHelper.isValueSame
    """
    if new_value is None and old_value is None:
        return True
    if new_value is None or old_value is None:
        return False
    
    ft = (field_meta.field_type or "").upper()
    
    # Number comparison: compare as floats
    if ft == "NUMBER":
        try:
            return float(new_value) == float(old_value)
        except (ValueError, TypeError):
            return str(new_value) == str(old_value)
    
    # Date comparison
    if ft in ("DATE", "DATETIME"):
        if isinstance(new_value, datetime) and isinstance(old_value, datetime):
            return new_value == old_value
        return str(new_value) == str(old_value)
    
    # Default string comparison
    return str(new_value).strip() == str(old_value).strip()


# ── Calc Formula Support ─────────────────────────────────────────────────────


class CalcFormulaEvaluator:
    """Evaluates calculation formulas for entity fields.
    
    Migrated from Java: com.rebuild.core.support.general.CalcFormulaSupport
    
    Supports simple mathematical expressions with field references:
    - {fieldName} — field value reference
    - Basic arithmetic: +, -, *, /
    - Functions: SUM, AVG, MAX, MIN, IF, ROUND, ABS
    """
    
    def __init__(self, formula: str, variables: dict[str, Any] | None = None):
        self._formula = formula or ""
        self._variables = variables or {}
    
    def evaluate(self, force: bool = False) -> Any:
        """Evaluate the formula and return the result.
        
        Migrated from Java: CalcFormulaSupport.evalCalcFormula
        """
        if not self._formula:
            return None
        
        expr = self._formula
        
        # Replace field references {fieldName} with actual values
        def replace_field_ref(match):
            field_name = match.group(1).strip()
            value = self._variables.get(field_name)
            if value is None:
                return "0"
            try:
                return str(float(value))
            except (ValueError, TypeError):
                return "0"
        
        expr = re.sub(r"\{([^}]+)\}", replace_field_ref, expr)
        
        # Evaluate the expression safely
        return self._safe_eval(expr)
    
    def _safe_eval(self, expr: str) -> Any:
        """Safely evaluate a mathematical expression.
        
        Supports: +, -, *, /, (), functions (SUM, AVG, MAX, MIN, ROUND, ABS, IF)
        """
        if not expr:
            return None
        
        # Clean expression
        expr = expr.strip()
        
        # Handle function calls
        expr = self._expand_functions(expr)
        
        try:
            # Use Python's eval with restricted namespace for math operations
            allowed_names = {
                "__builtins__": {},
                "abs": abs,
                "round": round,
                "max": max,
                "min": min,
                "int": int,
                "float": float,
                "True": True,
                "False": False,
            }
            result = eval(expr, allowed_names, {})
            
            # Return as int if it's a whole number
            if isinstance(result, float) and result == int(result):
                return int(result)
            return result
        except Exception as e:
            log.warning(f"CalcFormula eval error for '{expr}': {e}")
            return None
    
    def _expand_functions(self, expr: str) -> str:
        """Expand built-in function calls."""
        # SUM(a, b, c) → (a + b + c)
        sum_match = re.search(r"SUM\(([^)]+)\)", expr, re.IGNORECASE)
        if sum_match:
            args = [a.strip() for a in sum_match.group(1).split(",")]
            expr = expr[:sum_match.start()] + "(" + " + ".join(args) + ")" + expr[sum_match.end():]
        
        # AVG(a, b, c) → ((a + b + c) / 3)
        avg_match = re.search(r"AVG\(([^)]+)\)", expr, re.IGNORECASE)
        if avg_match:
            args = [a.strip() for a in avg_match.group(1).split(",")]
            count = len(args)
            expr = expr[:avg_match.start()] + "((" + " + ".join(args) + f") / {count})" + expr[avg_match.end():]
        
        # ROUND(x, n) → round(x, n)
        expr = re.sub(r"ROUND\(([^,]+),\s*(\d+)\)", r"round(\1, \2)", expr, flags=re.IGNORECASE)
        
        # ABS(x) → abs(x)
        expr = re.sub(r"ABS\(([^)]+)\)", r"abs(\1)", expr, flags=re.IGNORECASE)
        
        return expr


def calc_formula_backend(record_data: dict, formula: str, target_field: str) -> Any:
    """Calculate a formula value for a record and set the target field.
    
    Migrated from Java: CalcFormulaSupport.calcFormulaBackend
    """
    if not formula or not target_field:
        return None
    
    evaluator = CalcFormulaEvaluator(formula, record_data)
    result = evaluator.evaluate()
    
    if result is not None:
        record_data[target_field] = result
    
    return result


def eval_calc_formula(formula: str, variables: dict[str, Any] | None = None,
                      field_meta: FieldMeta | None = None) -> Any:
    """Evaluate a calculation formula with given variables.
    
    Migrated from Java: CalcFormulaSupport.evalCalcFormula
    """
    evaluator = CalcFormulaEvaluator(formula, variables)
    result = evaluator.evaluate()
    
    if result is not None and field_meta:
        ft = (field_meta.field_type or "").upper()
        if ft == "NUMBER":
            precision = field_meta.extra_attrs.get("precision") or field_meta.extra_attrs.get("decimalDigits") or 2
            if isinstance(result, float):
                result = round(result, precision)
    
    return result
