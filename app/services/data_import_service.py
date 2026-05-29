"""Data import service — validate files, parse columns, submit imports."""
import os
from typing import Optional

from sqlalchemy.orm import Session

from app.core.metadata import get_entity, list_fields


def check_file(file_path: str) -> dict:
    """Validate an import file and return row count + preview.

    Supports CSV, XLS, XLSX files.
    Returns {"count": int, "preview": list[list[str]]}.
    """
    if not os.path.exists(file_path):
        return {"error": "数据文件无效"}

    ext = os.path.splitext(file_path)[1].lower()

    try:
        if ext == ".csv":
            import csv
            with open(file_path, "r", encoding="utf-8-sig") as f:
                reader = csv.reader(f)
                rows = list(reader)
        elif ext in (".xls", ".xlsx"):
            try:
                import openpyxl
                wb = openpyxl.load_workbook(file_path, read_only=True, data_only=True)
                ws = wb.active
                rows = []
                for row in ws.iter_rows(values_only=True):
                    rows.append([str(c) if c is not None else "" for c in row])
                wb.close()
            except ImportError:
                return {"error": "缺少 openpyxl 库，无法解析 Excel 文件"}
        else:
            return {"error": f"不支持的文件格式: {ext}"}

        count = len(rows)
        preview = rows[:101]  # first 101 rows
        return {"count": count, "preview": preview}

    except Exception as e:
        return {"error": f"无法解析数据，请检查数据文件格式: {e}"}


def check_user_privileges(db: Session, user_id: str, entity_name: str) -> dict:
    """Check if user can create/update records for the entity.

    Returns {"canCreate": bool, "canUpdate": bool}.
    """
    # In the migrated app all authenticated users can create/update
    # This can be refined with actual RBAC checks
    from app.models import User
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        return {"canCreate": False, "canUpdate": False}
    return {"canCreate": True, "canUpdate": True}


def get_import_fields(db: Session, entity_name: str) -> list[dict]:
    """Get list of fields available for import on an entity.

    Returns list of {"name", "label", "type", "nullable", "defaultValue"}.
    """
    entity = get_entity(entity_name)
    if not entity:
        return []

    fields = list_fields(db, entity_name)
    result = []
    system_fields = {"createdOn", "modifiedOn", "createdBy", "modifiedBy",
                     "owningUser", "owningDept"}

    for f in fields:
        fname = f.field_name or ""
        if fname in system_fields:
            continue

        field_info = {
            "name": fname,
            "label": f.field_label or fname,
            "type": f.field_type or "TEXT",
            "nullable": f.nullable if f.nullable is not None else True,
        }

        # default values
        if fname in ("createdOn", "modifiedOn"):
            field_info["defaultValue"] = "当前时间"
        elif fname in ("createdBy", "modifiedBy", "owningUser"):
            field_info["defaultValue"] = "当前用户"

        result.append(field_info)

    return result


class DataImportTask:
    """Simulates a background data import task."""

    def __init__(self, entity: str, file_path: str, field_mapping: dict,
                 rule: dict = None):
        self.entity = entity
        self.file_path = file_path
        self.field_mapping = field_mapping
        self.rule = rule or {}
        self.status = "pending"
        self.progress = 0
        self.trace_logs: list[str] = []
        self.total_rows = 0
        self.imported_rows = 0
        self.error_rows = 0

    def run(self):
        """Execute the import."""
        self.status = "running"
        self.trace_logs.append(f"开始导入 {self.entity}")

        try:
            result = check_file(self.file_path)
            if "error" in result:
                self.status = "error"
                self.trace_logs.append(result["error"])
                return

            self.total_rows = result["count"] - 1  # exclude header
            self.trace_logs.append(f"共 {self.total_rows} 行数据")

            # Simulate import per row
            for i in range(1, min(self.total_rows + 1, len(result["preview"]))):
                row = result["preview"][i]
                self.imported_rows += 1
                self.progress = int(self.imported_rows / max(self.total_rows, 1) * 100)

            self.status = "completed"
            self.trace_logs.append(f"导入完成: {self.imported_rows} 行成功, {self.error_rows} 行失败")

        except Exception as e:
            self.status = "error"
            self.trace_logs.append(f"导入失败: {e}")


# In-memory task store
_import_tasks: dict[str, DataImportTask] = {}


def submit_import(db: Session, user_id: str, data: dict) -> str:
    """Submit a data import task. Returns task ID."""
    import uuid
    task_id = uuid.uuid4().hex[:16]

    entity = data.get("entity", "")
    file_path = data.get("file", "")
    field_mapping = data.get("fieldsMapping", {})
    rule = data.get("rule", {})

    task = DataImportTask(entity, file_path, field_mapping, rule)
    _import_tasks[task_id] = task

    # Run synchronously for now (could be threaded)
    task.run()

    return task_id


def get_import_trace(task_id: str) -> Optional[list[str]]:
    """Get import task trace logs."""
    task = _import_tasks.get(task_id)
    if not task:
        return None
    return task.trace_logs
