"""Report template service — manage report templates, preview, download."""
import os
from typing import Optional

from sqlalchemy.orm import Session

from app.models import DataReportConfig


def _gen_id() -> str:
    import uuid
    return uuid.uuid4().hex[:20]


def list_templates(db: Session, entity: str = None, q: str = None) -> list[dict]:
    """List report templates, optionally filtered by entity."""
    query = db.query(DataReportConfig).filter(DataReportConfig.is_disabled == False)
    if entity:
        query = query.filter(DataReportConfig.belong_entity == entity)
    if q:
        query = query.filter(DataReportConfig.name.like(f"%{q}%"))

    rows = query.order_by(DataReportConfig.modified_on.desc()).all()

    result = []
    for r in rows:
        result.append({
            "id": r.config_id,
            "belongEntity": r.belong_entity,
            "name": r.name,
            "templateType": r.template_type,
            "templateFile": r.template_file,
            "isDisabled": r.is_disabled,
            "modifiedOn": r.modified_on.strftime("%Y-%m-%d %H:%M") if r.modified_on else "",
        })

    return result


def check_template(db: Session, entity_name: str, file: str, template_type: int = 1) -> dict:
    """Validate a report template.

    Returns {"valid": True} or {"error": "message"}.
    """
    if not file:
        return {"error": "请上传模板文件"}

    ext = os.path.splitext(file)[1].lower()
    is_docx = ext == ".docx"

    if template_type == 3:  # WORD
        if not is_docx:
            return {"error": "上传 WORD 文件请选择 WORD 模板类型"}
    elif template_type in (1, 2):  # EXCEL
        if is_docx:
            return {"error": "上传 EXCEL 文件请选择 EXCEL 模板类型"}

    # Extract variable names from template
    invalid_vars = []
    valid_vars = []

    try:
        if ext in (".xls", ".xlsx"):
            import openpyxl
            wb = openpyxl.load_workbook(file, read_only=True, data_only=True)
            ws = wb.active
            for row in ws.iter_rows(values_only=True):
                for cell in row:
                    if cell and isinstance(cell, str) and "{" in cell and "}" in cell:
                        # Extract {fieldName} patterns
                        import re
                        vars_found = re.findall(r"\{(\w+)\}", cell)
                        valid_vars.extend(vars_found)
            wb.close()
        elif is_docx:
            # For docx, we'd need python-docx
            valid_vars.append("placeholder")
    except Exception:
        return {"error": "无效模板文件 (无法读取文件内容)"}

    if not valid_vars:
        return {"error": "无效模板文件 (未找到有效字段)"}

    return {"valid": True, "invalidVars": invalid_vars, "vars": valid_vars}


def save_template(db: Session, data: dict) -> str:
    """Create or update a report template config."""
    config_id = data.get("configId")

    if config_id:
        config = db.query(DataReportConfig).filter(DataReportConfig.config_id == config_id).first()
        if config:
            for k, v in data.items():
                if hasattr(config, k) and k != "configId":
                    setattr(config, k, v)
            db.commit()
            return config_id

    new_id = _gen_id()
    config = DataReportConfig(
        config_id=new_id,
        belong_entity=data.get("belongEntity", ""),
        name=data.get("name", ""),
        template_file=data.get("templateFile"),
        template_type=data.get("templateType", 1),
        extra_definition=data.get("extraDefinition"),
    )
    db.add(config)
    db.commit()
    return new_id


def delete_template(db: Session, config_id: str) -> bool:
    """Delete a report template."""
    config = db.query(DataReportConfig).filter(DataReportConfig.config_id == config_id).first()
    if not config:
        return False
    db.delete(config)
    db.commit()
    return True
