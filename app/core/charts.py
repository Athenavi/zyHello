"""Dashboard chart engine — chart types, data building, SQL construction.
Migrated from Java: ChartsFactory, ChartsHelper, ChartSpec, ChartData, Axis,
AxisEntry, Dimension, Numerical, FormatCalc, FormatSort, FormatStyle,
BarChart, LineChart, PieChart, FunnelChart, RadarChart, TreemapChart,
ScatterChart, ParetoChart, TableChart, IndexChart, CNMapChart, and builtin charts.
"""
from __future__ import annotations

import json
import logging
import math
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Optional

from sqlalchemy.orm import Session
from sqlalchemy import text

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class ChartType(Enum):
    BAR = "BAR"
    BAR2 = "BAR2"  # horizontal bar
    BAR3 = "BAR3"  # stacked bar
    LINE = "LINE"
    PIE = "PIE"
    FUNNEL = "FUNNEL"
    RADAR = "RADAR"
    TREEMAP = "TREEMAP"
    SCATTER = "SCATTER"
    PARETO = "PARETO"
    TABLE = "TABLE"
    INDEX = "INDEX"
    CNMAP = "CNMAP"
    DATALIST2 = "DATALIST2"


class FormatCalc(Enum):
    COUNT = "COUNT"
    SUM = "SUM"
    AVG = "AVG"
    MAX = "MAX"
    MIN = "MIN"
    COUNT_DISTINCT = "COUNT_DISTINCT"


class FormatSort(Enum):
    DEFAULT = "DEFAULT"
    ASC = "ASC"
    DESC = "DESC"


class FormatStyle(Enum):
    DEFAULT = "DEFAULT"
    PERCENTAGE = "PERCENTAGE"
    CURRENCY = "CURRENCY"


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class AxisEntry:
    """A single axis entry (field reference)."""
    field: str = ""
    field_name: str = ""
    label: str = ""

    def to_dict(self) -> dict:
        return {"field": self.field, "fieldName": self.field_name, "label": self.label}


@dataclass
class Dimension:
    """Chart dimension (grouping axis)."""
    field: str = ""
    label: str = ""
    sort: FormatSort = FormatSort.DEFAULT
    date_format: str = ""  # e.g., "yyyy-MM", "yyyy"

    def to_dict(self) -> dict:
        return {
            "field": self.field, "label": self.label,
            "sort": self.sort.value, "dateFormat": self.date_format,
        }


@dataclass
class Numerical:
    """Chart numerical (value axis)."""
    field: str = ""
    label: str = ""
    calc: FormatCalc = FormatCalc.COUNT
    sort: FormatSort = FormatSort.DEFAULT
    style: FormatStyle = FormatStyle.DEFAULT
    axis_index: int = 0

    def to_dict(self) -> dict:
        return {
            "field": self.field, "label": self.label,
            "calc": self.calc.value, "sort": self.sort.value,
            "style": self.style.value, "axisIndex": self.axis_index,
        }


@dataclass
class Axis:
    """Chart axis configuration."""
    dimension: Optional[Dimension] = None
    numericals: list[Numerical] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "dimension": self.dimension.to_dict() if self.dimension else None,
            "numericals": [n.to_dict() for n in self.numericals],
        }


@dataclass
class ChartData:
    """Chart data result."""
    data: list = field(default_factory=list)
    labels: list = field(default_factory=list)
    datasets: list = field(default_factory=list)
    total: int = 0
    axis: Optional[Axis] = None

    def to_dict(self) -> dict:
        return {
            "data": self.data, "labels": self.labels,
            "datasets": self.datasets, "total": self.total,
            "axis": self.axis.to_dict() if self.axis else None,
        }


@dataclass
class ChartSpec:
    """Chart specification / configuration."""
    chart_id: str = ""
    chart_type: ChartType = ChartType.BAR
    title: str = ""
    entity: str = ""
    axis: Optional[Axis] = None
    filter_json: Optional[dict] = None
    use_color: str = ""
    use_bgcolor: str = ""
    theme_style: str = ""
    show_legend: bool = True
    show_label: bool = False
    show_grid: bool = True
    show_axis: bool = True
    show_mixed: bool = False
    decimal_length: int = 2

    def to_dict(self) -> dict:
        return {
            "chartId": self.chart_id, "chartType": self.chart_type.value,
            "title": self.title, "entity": self.entity,
            "axis": self.axis.to_dict() if self.axis else None,
            "filter": self.filter_json, "useColor": self.use_color,
            "useBgcolor": self.use_bgcolor, "themeStyle": self.theme_style,
            "showLegend": self.show_legend, "showLabel": self.show_label,
            "showGrid": self.show_grid, "showAxis": self.show_axis,
            "showMixed": self.show_mixed, "decimalLength": self.decimal_length,
        }


# ---------------------------------------------------------------------------
# ChartsHelper — SQL construction helpers
# ---------------------------------------------------------------------------

class ChartsHelper:
    """Helper for constructing chart data queries."""

    @staticmethod
    def build_group_sql(entity: str, dimension: Dimension, numericals: list[Numerical],
                        filter_sql: str = None, limit: int = 100) -> str:
        """Build a GROUP BY SQL query for chart data."""
        dim_field = dimension.field
        select_parts = [f'"{dim_field}" AS "dim"']
        group_parts = [f'"{dim_field}"']
        order_parts = []

        for i, num in enumerate(numericals):
            alias = f"v{i}"
            func = num.calc.value
            if func in ("SUM", "AVG", "MAX", "MIN"):
                select_parts.append(f'{func}("{num.field}") AS "{alias}"')
            elif func == "COUNT_DISTINCT":
                select_parts.append(f'COUNT(DISTINCT "{num.field}") AS "{alias}"')
            else:
                select_parts.append(f'COUNT(*) AS "{alias}"')

            if num.sort == FormatSort.ASC:
                order_parts.append(f'"{alias}" ASC')
            elif num.sort == FormatSort.DESC:
                order_parts.append(f'"{alias}" DESC')

        if dimension.sort == FormatSort.ASC:
            order_parts.insert(0, f'"dim" ASC')
        elif dimension.sort == FormatSort.DESC:
            order_parts.insert(0, f'"dim" DESC')

        sql = f'SELECT {", ".join(select_parts)} FROM "{entity}"'

        where_parts = [f'"is_deleted" = 0'] if True else []
        if filter_sql:
            where_parts.append(filter_sql)
        if where_parts:
            sql += f' WHERE {" AND ".join(where_parts)}'

        sql += f' GROUP BY {", ".join(group_parts)}'

        if order_parts:
            sql += f' ORDER BY {", ".join(order_parts)}'

        if limit:
            sql += f" LIMIT {limit}"

        return sql

    @staticmethod
    def format_number(value: Any, decimal_length: int = 2, style: FormatStyle = FormatStyle.DEFAULT) -> Any:
        """Format a number value for display."""
        if value is None:
            return 0
        try:
            v = float(value)
        except (ValueError, TypeError):
            return value

        if style == FormatStyle.PERCENTAGE:
            return f"{v:.{decimal_length}f}%"
        if style == FormatStyle.CURRENCY:
            return f"¥{v:,.{decimal_length}f}"
        return round(v, decimal_length)


# ---------------------------------------------------------------------------
# Base chart class
# ---------------------------------------------------------------------------

class BaseChart(ABC):
    """Abstract base class for all chart types."""

    def __init__(self, spec: ChartSpec):
        self.spec = spec

    @abstractmethod
    def build_data(self, db: Session, user_id: str = None) -> ChartData:
        """Build chart data from the database."""
        ...

    def _execute_query(self, db: Session, sql: str, params: dict = None) -> list[dict]:
        """Execute a query and return list of row dicts."""
        try:
            rows = db.execute(text(sql), params or {}).fetchall()
            return [dict(r._mapping) for r in rows]
        except Exception as e:
            logger.error("Chart query failed: %s. SQL: %s", e, sql)
            return []

    def _build_bar_line_data(self, db: Session) -> ChartData:
        """Common data builder for bar/line charts."""
        axis = self.spec.axis
        if not axis or not axis.dimension or not axis.numericals:
            return ChartData()

        sql = ChartsHelper.build_group_sql(
            self.spec.entity, axis.dimension, axis.numericals,
            json.dumps(self.spec.filter_json) if self.spec.filter_json else None,
        )
        rows = self._execute_query(db, sql)

        labels = []
        datasets: dict[str, list] = {f"v{i}": [] for i in range(len(axis.numericals))}

        for row in rows:
            dim_val = row.get("dim", "")
            if dim_val is None:
                dim_val = "(empty)"
            labels.append(str(dim_val))
            for i in range(len(axis.numericals)):
                val = row.get(f"v{i}", 0)
                datasets[f"v{i}"].append(val)

        chart_datasets = []
        for i, num in enumerate(axis.numericals):
            chart_datasets.append({
                "label": num.label or num.field,
                "data": datasets[f"v{i}"],
                "axisIndex": num.axis_index,
            })

        return ChartData(labels=labels, datasets=chart_datasets, axis=axis)


# ---------------------------------------------------------------------------
# Concrete chart types
# ---------------------------------------------------------------------------

class BarChart(BaseChart):
    def build_data(self, db: Session, user_id: str = None) -> ChartData:
        return self._build_bar_line_data(db)


class LineChart(BaseChart):
    def build_data(self, db: Session, user_id: str = None) -> ChartData:
        return self._build_bar_line_data(db)


class PieChart(BaseChart):
    def build_data(self, db: Session, user_id: str = None) -> ChartData:
        axis = self.spec.axis
        if not axis or not axis.dimension or not axis.numericals:
            return ChartData()

        sql = ChartsHelper.build_group_sql(
            self.spec.entity, axis.dimension, axis.numericals,
        )
        rows = self._execute_query(db, sql)

        data = []
        for row in rows:
            label = str(row.get("dim", ""))
            value = row.get("v0", 0)
            data.append({"name": label, "value": value})

        return ChartData(data=data, axis=axis)


class FunnelChart(BaseChart):
    def build_data(self, db: Session, user_id: str = None) -> ChartData:
        result = PieChart(self.spec).build_data(db, user_id)
        # Sort descending for funnel effect
        result.data.sort(key=lambda x: x.get("value", 0), reverse=True)
        return result


class RadarChart(BaseChart):
    def build_data(self, db: Session, user_id: str = None) -> ChartData:
        axis = self.spec.axis
        if not axis or not axis.numericals:
            return ChartData()

        sql = ChartsHelper.build_group_sql(
            self.spec.entity, axis.dimension, axis.numericals,
        )
        rows = self._execute_query(db, sql)

        indicators = []
        values = []
        for row in rows:
            label = str(row.get("dim", ""))
            indicators.append({"name": label, "max": 100})
            values.append(row.get("v0", 0))

        # Normalize values to percentage for radar
        max_val = max(values) if values else 1
        if max_val > 0:
            values = [round(v / max_val * 100, 2) for v in values]

        data = [{"indicator": indicators, "value": values}]
        return ChartData(data=data, axis=axis)


class TreemapChart(BaseChart):
    def build_data(self, db: Session, user_id: str = None) -> ChartData:
        return PieChart(self.spec).build_data(db, user_id)


class ScatterChart(BaseChart):
    def build_data(self, db: Session, user_id: str = None) -> ChartData:
        axis = self.spec.axis
        if not axis or not axis.dimension or len(axis.numericals) < 2:
            return ChartData()

        dim_field = axis.dimension.field
        x_field = axis.numericals[0].field
        y_field = axis.numericals[1].field

        sql = (
            f'SELECT "{dim_field}" AS "dim", '
            f'"{x_field}" AS "x", "{y_field}" AS "y" '
            f'FROM "{self.spec.entity}" '
            f'WHERE "is_deleted" = 0 LIMIT 500'
        )
        rows = self._execute_query(db, sql)

        data = []
        for row in rows:
            data.append({
                "name": str(row.get("dim", "")),
                "value": [row.get("x", 0), row.get("y", 0)],
            })

        return ChartData(data=data, axis=axis)


class ParetoChart(BaseChart):
    def build_data(self, db: Session, user_id: str = None) -> ChartData:
        result = self._build_bar_line_data(db)
        # Calculate cumulative percentage for pareto line
        if result.datasets:
            values = result.datasets[0].get("data", [])
            total = sum(v or 0 for v in values)
            cumulative = []
            running = 0
            for v in values:
                running += (v or 0)
                pct = round(running / total * 100, 2) if total else 0
                cumulative.append(pct)
            result.datasets.append({"label": "Cumulative %", "data": cumulative, "axisIndex": 1})
        return result


class TableChart(BaseChart):
    def build_data(self, db: Session, user_id: str = None) -> ChartData:
        axis = self.spec.axis
        if not axis or not axis.numericals:
            return ChartData()

        fields = []
        for num in axis.numericals:
            func = num.calc.value
            if func in ("SUM", "AVG", "MAX", "MIN"):
                fields.append(f'{func}("{num.field}") AS "{num.label or num.field}"')
            elif func == "COUNT_DISTINCT":
                fields.append(f'COUNT(DISTINCT "{num.field}") AS "{num.label or num.field}"')
            else:
                fields.append(f'COUNT(*) AS "{num.label or num.field}"')

        sql = f'SELECT {", ".join(fields)} FROM "{self.spec.entity}" WHERE "is_deleted" = 0'
        rows = self._execute_query(db, sql)

        return ChartData(data=rows, axis=axis)


class IndexChart(BaseChart):
    def build_data(self, db: Session, user_id: str = None) -> ChartData:
        """Single-value index card (KPI)."""
        axis = self.spec.axis
        if not axis or not axis.numericals:
            return ChartData()

        num = axis.numericals[0]
        func = num.calc.value
        if func in ("SUM", "AVG", "MAX", "MIN"):
            expr = f'{func}("{num.field}")'
        elif func == "COUNT_DISTINCT":
            expr = f'COUNT(DISTINCT "{num.field}")'
        else:
            expr = "COUNT(*)"

        sql = f'SELECT {expr} AS "v" FROM "{self.spec.entity}" WHERE "is_deleted" = 0'
        rows = self._execute_query(db, sql)

        value = rows[0].get("v", 0) if rows else 0
        return ChartData(data=[{"value": value}], axis=axis)


class CNMapChart(BaseChart):
    def build_data(self, db: Session, user_id: str = None) -> ChartData:
        """China map chart — same data format as pie chart."""
        return PieChart(self.spec).build_data(db, user_id)


class DataList2Chart(BaseChart):
    """Data list chart type."""
    def build_data(self, db: Session, user_id: str = None) -> ChartData:
        return ChartData(data=[], axis=self.spec.axis)


# ---------------------------------------------------------------------------
# ChartsFactory — chart type factory
# ---------------------------------------------------------------------------

_CHART_TYPE_MAP = {
    ChartType.BAR: BarChart,
    ChartType.BAR2: BarChart,
    ChartType.BAR3: BarChart,
    ChartType.LINE: LineChart,
    ChartType.PIE: PieChart,
    ChartType.FUNNEL: FunnelChart,
    ChartType.RADAR: RadarChart,
    ChartType.TREEMAP: TreemapChart,
    ChartType.SCATTER: ScatterChart,
    ChartType.PARETO: ParetoChart,
    ChartType.TABLE: TableChart,
    ChartType.INDEX: IndexChart,
    ChartType.CNMAP: CNMapChart,
    ChartType.DATALIST2: DataList2Chart,
}


class ChartsFactory:
    """Factory for creating chart instances from spec."""

    @staticmethod
    def create(spec: ChartSpec) -> BaseChart:
        """Create a chart instance from a ChartSpec."""
        chart_class = _CHART_TYPE_MAP.get(spec.chart_type)
        if not chart_class:
            raise ValueError(f"Unsupported chart type: {spec.chart_type}")
        return chart_class(spec)

    @staticmethod
    def parse_spec(spec_dict: dict) -> ChartSpec:
        """Parse a chart specification dict into a ChartSpec object."""
        chart_type_name = spec_dict.get("chartType", "BAR")
        try:
            chart_type = ChartType(chart_type_name)
        except ValueError:
            chart_type = ChartType.BAR

        axis = None
        axis_data = spec_dict.get("axis")
        if axis_data:
            dim = None
            dim_data = axis_data.get("dimension")
            if dim_data:
                dim = Dimension(
                    field=dim_data.get("field", ""),
                    label=dim_data.get("label", ""),
                    sort=FormatSort(dim_data.get("sort", "DEFAULT")),
                    date_format=dim_data.get("dateFormat", ""),
                )

            numericals = []
            for n in (axis_data.get("numericals") or []):
                try:
                    calc = FormatCalc(n.get("calc", "COUNT"))
                except ValueError:
                    calc = FormatCalc.COUNT
                try:
                    sort = FormatSort(n.get("sort", "DEFAULT"))
                except ValueError:
                    sort = FormatSort.DEFAULT
                try:
                    style = FormatStyle(n.get("style", "DEFAULT"))
                except ValueError:
                    style = FormatStyle.DEFAULT

                numericals.append(Numerical(
                    field=n.get("field", ""),
                    label=n.get("label", ""),
                    calc=calc, sort=sort, style=style,
                    axis_index=n.get("axisIndex", 0),
                ))

            axis = Axis(dimension=dim, numericals=numericals)

        return ChartSpec(
            chart_id=spec_dict.get("chartId", ""),
            chart_type=chart_type,
            title=spec_dict.get("title", ""),
            entity=spec_dict.get("entity", ""),
            axis=axis,
            filter_json=spec_dict.get("filter"),
            use_color=spec_dict.get("useColor", ""),
            use_bgcolor=spec_dict.get("useBgcolor", ""),
            theme_style=spec_dict.get("themeStyle", ""),
            show_legend=spec_dict.get("showLegend", True),
            show_label=spec_dict.get("showLabel", False),
            show_grid=spec_dict.get("showGrid", True),
            show_axis=spec_dict.get("showAxis", True),
            show_mixed=spec_dict.get("showMixed", False),
            decimal_length=spec_dict.get("decimalLength", 2),
        )

    @staticmethod
    def get_chart_types() -> list[dict]:
        """Return all available chart types with labels."""
        return [
            {"type": "BAR", "label": "Bar Chart", "category": "basic"},
            {"type": "BAR2", "label": "Horizontal Bar", "category": "basic"},
            {"type": "BAR3", "label": "Stacked Bar", "category": "basic"},
            {"type": "LINE", "label": "Line Chart", "category": "basic"},
            {"type": "PIE", "label": "Pie Chart", "category": "basic"},
            {"type": "FUNNEL", "label": "Funnel Chart", "category": "basic"},
            {"type": "RADAR", "label": "Radar Chart", "category": "basic"},
            {"type": "TREEMAP", "label": "Treemap Chart", "category": "basic"},
            {"type": "SCATTER", "label": "Scatter Chart", "category": "basic"},
            {"type": "PARETO", "label": "Pareto Chart", "category": "basic"},
            {"type": "TABLE", "label": "Data Table", "category": "data"},
            {"type": "INDEX", "label": "Index Card", "category": "data"},
            {"type": "CNMAP", "label": "China Map", "category": "map"},
            {"type": "DATALIST2", "label": "Data List", "category": "data"},
        ]
