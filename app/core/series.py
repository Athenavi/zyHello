"""Auto-number series generators.

Migrated from Java: SeriesGenerator, SeriesGeneratorFactory, SeriesVar,
FieldVar, IncreasingVar, TimeVar, SeriesZeroResetJob.
"""
from __future__ import annotations
import re
import time
import logging
from datetime import datetime
from typing import Any, Optional
logger=logging.getLogger(__name__)
class SeriesVar:
    """Base class for series variable replacements."""
    def __init__(self, var_name: str, var_format: str = ""):
        self._name = var_name
        self._fmt = var_format
    def evaluate(self, current_value: str = "") -> str:
        raise NotImplementedError
class FieldVar(SeriesVar):
    def __init__(self, var_name: str, field_name: str):
        super().__init__(var_name)
        self._field = field_name
    def evaluate(self, record_data: dict | None = None, current_value: str = "") -> str:
        if record_data and self._field in record_data:
            return str(record_data[self._field])
        return ""
class IncreasingVar(SeriesVar):
    def __init__(self, var_name: str = "SERIES", padding: int = 4, step: int = 1, seed: int = 1):
        super().__init__(var_name)
        self._padding = padding
        self._step = step
        self._seed = seed
    def evaluate(self, seq_no: int = 0, current_value: str = "") -> str:
        if current_value:
            try:
                seq_no = int(re.sub(r"[^0-9]", "", current_value))
            except ValueError:
                seq_no = 0
        val = seq_no if seq_no > 0 else self._seed
        return str(val).zfill(self._padding)
class TimeVar(SeriesVar):
    def __init__(self, var_name: str = "DATE", date_format: str = "yyyyMMdd"):
        super().__init__(var_name, date_format)
    def evaluate(self, current_value: str = "") -> str:
        fmt = self._fmt or "yyyyMMdd"
        fmt = fmt.replace("yyyy", "%Y").replace("MM", "%m").replace("dd", "%d")
        fmt = fmt.replace("HH", "%H").replace("mm", "%M").replace("ss", "%S")
        return datetime.now().strftime(fmt)
class SeriesGenerator:
    """Generates auto-number series values from a pattern."""
    def __init__(self, pattern: str, vars_list: list[SeriesVar] | None = None):
        self._pattern = pattern
        self._vars = vars_list or [IncreasingVar(), TimeVar()]
    def generate(self, seq_no: int = 0, record_data: dict | None = None) -> str:
        result = self._pattern
        for var in self._vars:
            placeholder = "{" + var._name + "}"
            if placeholder in result:
                if isinstance(var, FieldVar):
                    val = var.evaluate(record_data=record_data)
                elif isinstance(var, IncreasingVar):
                    val = var.evaluate(seq_no=seq_no)
                else:
                    val = var.evaluate()
                result = result.replace(placeholder, val)
        return result
def create_series_generator(pattern: str) -> SeriesGenerator:
    """Factory: parse pattern and create appropriate generator."""
    vars_list = []
    if "{SERIES}" in pattern:
        m = re.search(r"\{SERIES:(\d+)(?::(\d+))?\}", pattern)
        if m:
            padding = int(m.group(1))
            seed = int(m.group(2)) if m.group(2) else 1
            vars_list.append(IncreasingVar(padding=padding, seed=seed))
            pattern = re.sub(r"\{SERIES:\d+(?::\d+)?\}", "{SERIES}", pattern)
        else:
            vars_list.append(IncreasingVar())
    if "{DATE}" in pattern or "{YYYY}" in pattern or "{MM}" in pattern:
        vars_list.append(TimeVar())
    field_vars = re.findall(r"\{(\w+)\}", pattern)
    for fv in field_vars:
        if fv not in ("SERIES", "DATE", "YYYY", "MM", "DD", "HH", "MI", "SS"):
            vars_list.append(FieldVar(fv, fv))
    return SeriesGenerator(pattern, vars_list)
