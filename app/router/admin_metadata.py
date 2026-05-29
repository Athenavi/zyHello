"""Admin metadata routes — entities, fields, forms, classifications, i18n, CRUD APIs."""
from fastapi import APIRouter, Depends, Request, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.deps import get_current_user
from app.models import User
from app.template_deps import templates
from app.core import (
    contains_entity, get_entity, get_entities, get_detail_entities,
    get_reference_entities, is_bizz_entity, has_privileges_field,
    create_entity, update_entity, delete_entity, list_entities,
    create_field, update_field, delete_field, list_fields,
    get_picklist, get_classification, reload_metadata,
    get_form_layout, save_form_layout,
    get_list_fields, save_list_config,
    get_view_config, save_view_config,
)

router = APIRouter()


# ══════════════════════════════════════════════════════════════════════
# Template-rendering routes (page views)
# ══════════════════════════════════════════════════════════════════════


@router.get("/admin/metadata/entities")
async def entities_page(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Render entities list page."""
    return templates.TemplateResponse(request, "admin/metadata/entities.html", {
        "user": current_user,
    })


@router.get("/admin/metadata/entity/{entity}/base")
async def entity_edit(
    entity: str,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Render entity base configuration page."""
    return templates.TemplateResponse(request, "admin/metadata/entity-edit.html", {
        "user": current_user,
        "entity": entity,
    })


@router.get("/admin/metadata/entity/{entity}/fields")
async def entity_fields(
    entity: str,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Render entity fields list page."""
    return templates.TemplateResponse(request, "admin/metadata/fields.html", {
        "user": current_user,
        "entity": entity,
    })


@router.get("/admin/metadata/entity/{entity}/field/{field}")
async def field_edit(
    entity: str,
    field: str,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Render field edit page."""
    return templates.TemplateResponse(request, "admin/metadata/field-edit.html", {
        "user": current_user,
        "entity": entity,
        "field": field,
    })


@router.get("/admin/metadata/entity/{entity}/advanced")
async def entity_advanced(
    entity: str,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Render entity advanced settings page."""
    return templates.TemplateResponse(request, "admin/metadata/entity-advanced.html", {
        "user": current_user,
        "entity": entity,
    })


@router.get("/admin/metadata/entity/{entity}/overview")
async def entity_overview(
    entity: str,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Render entity overview page."""
    return templates.TemplateResponse(request, "admin/metadata/entity-overview.html", {
        "user": current_user,
        "entity": entity,
    })


@router.get("/admin/metadata/entity/{entity}/form-design")
async def form_design(
    entity: str,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Render form design page."""
    return templates.TemplateResponse(request, "admin/metadata/form-design.html", {
        "user": current_user,
        "entity": entity,
    })


@router.get("/admin/metadata/entity/{entity}/i18n")
async def entity_i18n(
    entity: str,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Render entity i18n page."""
    return templates.TemplateResponse(request, "admin/metadata/entity-i18n.html", {
        "user": current_user,
        "entity": entity,
    })


@router.get("/admin/metadata/classifications")
async def classification_list(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Render classification list page."""
    return templates.TemplateResponse(request, "admin/metadata/classification-list.html", {
        "user": current_user,
    })


@router.get("/admin/metadata/classification/{id}")
async def classification_editor(
    id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Render classification editor page."""
    return templates.TemplateResponse(request, "admin/metadata/classification-editor.html", {
        "user": current_user,
        "classification_id": id,
    })


@router.get("/admin/metadata/{entity}/{field}/auto-fillin")
async def auto_fillin(
    entity: str,
    field: str,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Render auto-fillin configuration page."""
    return templates.TemplateResponse(request, "admin/metadata/auto-fillin.html", {
        "user": current_user,
        "entity": entity,
        "field": field,
    })


# ══════════════════════════════════════════════════════════════════════
# API endpoints — Entity CRUD
# Migrated from Meta2SchemaController / EntityController
# ══════════════════════════════════════════════════════════════════════


@router.get("/admin/metadata/entity-list")
async def api_entity_list(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all entities.

    Migrated from MetadataGetting.entities.
    """
    entities = list_entities(db)
    return {"error_code": 0, "data": entities}


@router.post("/admin/metadata/entity-create")
async def api_entity_create(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new entity.

    Migrated from Meta2SchemaController.
    """
    body = await request.json()
    entity_name = body.get("entityName")
    label = body.get("label")
    icon = body.get("icon")
    comments = body.get("comments")

    if not entity_name or not label:
        return {"error_code": 400, "error_msg": "Entity name and label required"}

    result = create_entity(db, entity_name, label, icon, comments, str(current_user.user_id))
    if isinstance(result, str):
        return {"error_code": 400, "error_msg": result}
    return {"error_code": 0, "data": result}


@router.post("/admin/metadata/entity-update")
async def api_entity_update(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update an entity.

    Migrated from Meta2SchemaController.
    """
    body = await request.json()
    entity_name = body.get("entityName")
    label = body.get("label")
    icon = body.get("icon")
    comments = body.get("comments")

    if not entity_name:
        return {"error_code": 400, "error_msg": "Entity name required"}

    result = update_entity(db, entity_name, label, icon, comments, str(current_user.user_id))
    if isinstance(result, str):
        return {"error_code": 400, "error_msg": result}
    return {"error_code": 0, "data": result}


@router.post("/admin/metadata/entity-delete")
async def api_entity_delete(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete an entity.

    Migrated from Meta2SchemaController.
    """
    body = await request.json()
    entity_name = body.get("entityName")

    if not entity_name:
        return {"error_code": 400, "error_msg": "Entity name required"}

    result = delete_entity(db, entity_name, str(current_user.user_id))
    if isinstance(result, str):
        return {"error_code": 400, "error_msg": result}
    return {"error_code": 0, "data": True}


# ══════════════════════════════════════════════════════════════════════
# API endpoints — Field CRUD
# Migrated from Field2SchemaController
# ══════════════════════════════════════════════════════════════════════


@router.get("/admin/metadata/field-list")
async def api_field_list(
    entity: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all fields for an entity.

    Migrated from MetadataGetting.fields.
    """
    fields = list_fields(db, entity)
    return {"error_code": 0, "data": fields}


@router.post("/admin/metadata/field-create")
async def api_field_create(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new field.

    Migrated from Field2SchemaController.
    """
    body = await request.json()
    entity_name = body.get("entityName")
    field_name = body.get("fieldName")
    label = body.get("label")
    field_type = body.get("type", "TEXT")
    comments = body.get("comments")
    nullable = body.get("nullable", True)
    default_value = body.get("defaultValue")

    if not entity_name or not field_name or not label:
        return {"error_code": 400, "error_msg": "Entity name, field name, and label required"}

    result = create_field(db, entity_name, field_name, label, field_type,
                          comments, nullable, default_value, str(current_user.user_id))
    if isinstance(result, str):
        return {"error_code": 400, "error_msg": result}
    return {"error_code": 0, "data": result}


@router.post("/admin/metadata/field-update")
async def api_field_update(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a field.

    Migrated from Field2SchemaController.
    """
    body = await request.json()
    entity_name = body.get("entityName")
    field_name = body.get("fieldName")
    label = body.get("label")
    comments = body.get("comments")
    nullable = body.get("nullable")

    if not entity_name or not field_name:
        return {"error_code": 400, "error_msg": "Entity name and field name required"}

    result = update_field(db, entity_name, field_name, label, comments, nullable, str(current_user.user_id))
    if isinstance(result, str):
        return {"error_code": 400, "error_msg": result}
    return {"error_code": 0, "data": result}


@router.post("/admin/metadata/field-delete")
async def api_field_delete(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a field.

    Migrated from Field2SchemaController.
    """
    body = await request.json()
    entity_name = body.get("entityName")
    field_name = body.get("fieldName")

    if not entity_name or not field_name:
        return {"error_code": 400, "error_msg": "Entity name and field name required"}

    result = delete_field(db, entity_name, field_name, str(current_user.user_id))
    if isinstance(result, str):
        return {"error_code": 400, "error_msg": result}
    return {"error_code": 0, "data": True}


# ══════════════════════════════════════════════════════════════════════
# API endpoints — Form / List / View Configuration
# Migrated from FormsController / ListController / ViewAddonsController
# ══════════════════════════════════════════════════════════════════════


@router.get("/admin/metadata/form-layout")
async def api_form_layout(
    entity: str = Query(...),
    layout: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get form layout configuration.

    Migrated from FormsManager.
    """
    result = get_form_layout(db, entity, layout)
    return {"error_code": 0, "data": result}


@router.post("/admin/metadata/form-layout")
async def api_save_form_layout(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save form layout configuration.

    Migrated from FormsController.
    """
    body = await request.json()
    entity_name = body.get("entityName")
    layout = body.get("layout")
    config = body.get("config")

    if not entity_name or not config:
        return {"error_code": 400, "error_msg": "Entity name and config required"}

    result = save_form_layout(db, entity_name, config, layout, str(current_user.user_id))
    if isinstance(result, str):
        return {"error_code": 400, "error_msg": result}
    return {"error_code": 0, "data": result}


@router.get("/admin/metadata/list-config")
async def api_list_config(
    entity: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get list configuration.

    Migrated from ListController.
    """
    result = get_list_fields(db, entity)
    return {"error_code": 0, "data": result}


@router.post("/admin/metadata/list-config")
async def api_save_list_config(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save list configuration.

    Migrated from ListController.
    """
    body = await request.json()
    entity_name = body.get("entityName")
    config = body.get("config")

    if not entity_name or not config:
        return {"error_code": 400, "error_msg": "Entity name and config required"}

    result = save_list_config(db, entity_name, config, str(current_user.user_id))
    if isinstance(result, str):
        return {"error_code": 400, "error_msg": result}
    return {"error_code": 0, "data": result}


@router.get("/admin/metadata/view-config")
async def api_view_config(
    entity: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get view configuration.

    Migrated from ViewAddonsManager.
    """
    result = get_view_config(db, entity)
    return {"error_code": 0, "data": result}


@router.post("/admin/metadata/view-config")
async def api_save_view_config(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save view configuration.

    Migrated from ViewAddonsController.
    """
    body = await request.json()
    entity_name = body.get("entityName")
    config = body.get("config")

    if not entity_name or not config:
        return {"error_code": 400, "error_msg": "Entity name and config required"}

    result = save_view_config(db, entity_name, config, str(current_user.user_id))
    if isinstance(result, str):
        return {"error_code": 400, "error_msg": result}
    return {"error_code": 0, "data": result}


# ══════════════════════════════════════════════════════════════════════
# API endpoints — Picklist / Classification
# Migrated from PickListController / ClassificationController
# ══════════════════════════════════════════════════════════════════════


@router.get("/admin/metadata/picklist")
async def api_picklist(
    entity: str = Query(...),
    field: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get picklist options for a field.

    Migrated from PickListController.
    """
    result = get_picklist(db, entity, field)
    return {"error_code": 0, "data": result}


@router.get("/admin/metadata/classification-data")
async def api_classification_data(
    id: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get classification data by ID.

    Migrated from ClassificationController.
    """
    result = get_classification(db, id)
    return {"error_code": 0, "data": result}


# ══════════════════════════════════════════════════════════════════════
# API endpoints — Metadata Reload
# ══════════════════════════════════════════════════════════════════════


@router.post("/admin/metadata/reload")
async def api_reload_metadata(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Reload metadata registry from database.

    Admin utility endpoint.
    """
    reload_metadata(db)
    return {"error_code": 0, "data": True}
