"""General entity routes — record CRUD, list data, view models, related lists, print, reference search."""
from fastapi import APIRouter, Depends, Query, Request, Body
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.deps import get_current_user
from app.models import User
from app.template_deps import templates
from app.core import (
    save_record, delete_record, get_record, list_records, find_records,
    assign_record, share_record, unshare_record, get_shared_list,
    get_record_meta, get_record_history,
    contains_entity, get_entity, get_entities, get_detail_entities, list_fields,
    list_fields_as_dicts, entity_meta_to_dict,
    get_form_layout, get_list_fields, get_view_config,
    get_classification, get_picklist,
    parse_filter_to_sql, save_adv_filter, get_adv_filter, list_adv_filters,
    search_users,
)

router = APIRouter()


# ══════════════════════════════════════════════════════════════════════
# Template-rendering routes (page views)
# ══════════════════════════════════════════════════════════════════════


@router.get("/app/{entity}/list")
async def record_list(
    entity: str,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Render entity record list page."""
    return templates.TemplateResponse(request, "general/record-list.html", {
        "user": current_user,
        "entity": entity,
    })


@router.get("/app/{entity}/view/{record_id}")
async def record_view(
    entity: str,
    record_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Render entity record detail view."""
    return templates.TemplateResponse(request, "general/record-view.html", {
        "user": current_user,
        "entity": entity,
        "record_id": record_id,
    })


@router.get("/app/{entity}/detail/{record_id}")
async def detail_view(
    entity: str,
    record_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Render entity detail view."""
    return templates.TemplateResponse(request, "general/detail-view.html", {
        "user": current_user,
        "entity": entity,
        "record_id": record_id,
    })


@router.get("/app/{entity}/print")
async def print_preview(
    entity: str,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Render print preview page."""
    return templates.TemplateResponse(request, "general/print-preview.html", {
        "user": current_user,
        "entity": entity,
    })


@router.get("/app/{entity}/reference-search")
async def reference_search(
    entity: str,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Render reference search dialog."""
    return templates.TemplateResponse(request, "general/reference-search.html", {
        "user": current_user,
        "entity": entity,
    })


@router.get("/app/{entity}/detail-list")
async def detail_list_page(
    entity: str,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Render detail list (related records) page."""
    return templates.TemplateResponse(request, "general/detail-list.html", {
        "user": current_user,
        "entity": entity,
    })


@router.get("/app/{entity}/list-fields")
async def list_fields_page(
    entity: str,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Render list field selector."""
    return templates.TemplateResponse(request, "general/list-fields.html", {
        "user": current_user,
        "entity": entity,
    })


@router.get("/app/entity/view")
async def dock_view(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Render dock (side-panel) view."""
    return templates.TemplateResponse(request, "general/dock-view.html", {
        "user": current_user,
    })


@router.get("/app/entity/form")
async def dock_form(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Render dock (side-panel) form."""
    return templates.TemplateResponse(request, "general/dock-form.html", {
        "user": current_user,
    })


# ══════════════════════════════════════════════════════════════════════
# API endpoints — Record CRUD (GeneralOperatingController)
# ══════════════════════════════════════════════════════════════════════


@router.post("/app/{entity}/record-save")
async def api_record_save(
    entity: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save (create or update) a record.

    Migrated from GeneralOperatingController.record-save.
    """
    body = await request.json()
    record_id = body.get("id")
    data = body.get("data", {})
    fields_approval = body.get("fieldsApproval", [])

    if record_id:
        result = save_record(db, entity, data, str(current_user.user_id), record_id=record_id)
    else:
        result = save_record(db, entity, data, str(current_user.user_id))

    if isinstance(result, str):
        return {"error_code": 400, "error_msg": result}
    return {"error_code": 0, "data": result}


@router.post("/app/{entity}/record-delete")
async def api_record_delete(
    entity: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete one or more records.

    Migrated from GeneralOperatingController.record-delete.
    """
    body = await request.json()
    record_ids = body.get("id", [])
    if isinstance(record_ids, str):
        record_ids = [record_ids]

    deleted = 0
    errors = []
    for rid in record_ids:
        try:
            delete_record(db, rid, user_id=str(current_user.user_id))
            deleted += 1
        except ValueError as e:
            errors.append(str(e))

    if errors:
        return {"error_code": 400, "error_msg": "; ".join(errors), "data": deleted}
    return {"error_code": 0, "data": deleted}


@router.post("/app/{entity}/record-assign")
async def api_record_assign(
    entity: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Assign record(s) to a user.

    Migrated from GeneralOperatingController.record-assign.
    """
    body = await request.json()
    record_ids = body.get("id", [])
    assign_to = body.get("to")
    cascades = body.get("cascades", [])

    if isinstance(record_ids, str):
        record_ids = [record_ids]

    if not assign_to:
        return {"error_code": 400, "error_msg": "Assign target user required"}

    results = []
    for rid in record_ids:
        try:
            assign_record(db, rid, assign_to, str(current_user.user_id))
            results.append({"id": rid, "success": True})
        except ValueError as e:
            results.append({"id": rid, "error": str(e)})

    return {"error_code": 0, "data": results}


@router.post("/app/{entity}/record-share")
async def api_record_share(
    entity: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Share record(s) with user(s).

    Migrated from GeneralOperatingController.record-share.
    """
    body = await request.json()
    record_ids = body.get("id", [])
    share_to = body.get("to", [])
    cascades = body.get("cascades", [])

    if isinstance(record_ids, str):
        record_ids = [record_ids]
    if isinstance(share_to, str):
        share_to = [share_to]

    if not share_to:
        return {"error_code": 400, "error_msg": "Share target users required"}

    results = []
    for rid in record_ids:
        for uid in share_to:
            try:
                share_record(db, rid, uid, user_id=str(current_user.user_id))
                results.append({"id": rid, "to": uid, "success": True})
            except ValueError as e:
                results.append({"id": rid, "to": uid, "error": str(e)})

    return {"error_code": 0, "data": results}


@router.post("/app/{entity}/record-unshare")
async def api_record_unshare(
    entity: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Unshare record(s) from user(s).

    Migrated from GeneralOperatingController.record-unshare.
    """
    body = await request.json()
    record_ids = body.get("id", [])
    unshare_from = body.get("to", [])

    if isinstance(record_ids, str):
        record_ids = [record_ids]
    if isinstance(unshare_from, str):
        unshare_from = [unshare_from]

    results = []
    for rid in record_ids:
        for uid in unshare_from:
            try:
                unshare_record(db, rid, uid, user_id=str(current_user.user_id))
                results.append({"id": rid, "to": uid, "success": True})
            except ValueError as e:
                results.append({"id": rid, "to": uid, "error": str(e)})

    return {"error_code": 0, "data": results}


@router.post("/app/{entity}/record-unshare-batch")
async def api_record_unshare_batch(
    entity: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Batch unshare records.

    Migrated from GeneralOperatingController.record-unshare-batch.
    """
    body = await request.json()
    record_ids = body.get("id", [])
    unshare_from = body.get("to", [])

    if isinstance(record_ids, str):
        record_ids = [record_ids]
    if isinstance(unshare_from, str):
        unshare_from = [unshare_from]

    count = 0
    for rid in record_ids:
        for uid in unshare_from:
            try:
                unshare_record(db, rid, uid, user_id=str(current_user.user_id))
                count += 1
            except ValueError:
                pass

    return {"error_code": 0, "data": count}


@router.get("/app/{entity}/shared-list")
async def api_shared_list(
    entity: str,
    record_id: str = Query(..., alias="record"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get list of users a record is shared with.

    Migrated from GeneralOperatingController.shared-list.
    """
    result = get_shared_list(db, record_id)
    return {"error_code": 0, "data": result}


# ══════════════════════════════════════════════════════════════════════
# API endpoints — Data List (GeneralListController)
# ══════════════════════════════════════════════════════════════════════


@router.post("/app/{entity}/data-list")
async def api_data_list(
    entity: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get paginated data list for an entity.

    Migrated from GeneralListController.data-list.
    """
    body = await request.json()
    page_no = body.get("pageNo", 1)
    page_size = body.get("pageSize", 20)
    sort = body.get("sort")
    filter_expr = body.get("filter")
    fields_filter = body.get("fieldsFilter")

    result = list_records(
        db, entity,
        page_no=page_no, page_size=page_size,
        user_id=current_user.user_id,
    )
    records = result.get("data", [])
    total = result.get("total", 0)

    return {
        "error_code": 0,
        "data": {
            "total": total,
            "pageNo": page_no,
            "pageSize": page_size,
            "data": records,
        },
    }


@router.get("/app/{entity}/data-list")
async def api_data_list_get(
    entity: str,
    page_no: int = Query(1, alias="pageNo"),
    page_size: int = Query(20, alias="pageSize"),
    sort: Optional[str] = None,
    filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get paginated data list (GET variant).

    Migrated from GeneralListController.
    """
    result = list_records(
        db, entity,
        page_no=page_no, page_size=page_size,
        user_id=current_user.user_id,
    )
    records = result.get("data", [])
    total = result.get("total", 0)

    return {
        "error_code": 0,
        "data": {
            "total": total,
            "pageNo": page_no,
            "pageSize": page_size,
            "data": records,
        },
    }


# ══════════════════════════════════════════════════════════════════════
# API endpoints — View/Form Model (GeneralModelController)
# ══════════════════════════════════════════════════════════════════════


@router.get("/app/{entity}/view-model")
async def api_view_model(
    entity: str,
    record: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get view model for a record.

    Migrated from GeneralModelController.view-model.
    """
    record_data = get_record(db, record)
    if not record_data:
        return {"error_code": 404, "error_msg": "Record not found"}

    view_config = get_view_config(db, entity)
    meta = get_record_meta(db, record)

    return {
        "error_code": 0,
        "data": {
            "record": record_data,
            "meta": meta,
            "viewConfig": view_config,
        },
    }


@router.post("/app/{entity}/form-model")
async def api_form_model(
    entity: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get form model for creating/editing a record.

    Migrated from GeneralModelController.form-model.
    """
    body = await request.json()
    record_id = body.get("id")
    layout_id = body.get("layout")

    form_layout = get_form_layout(db, entity, layout_id)
    meta = get_record_meta(db, record_id) if record_id else {}

    record_data = None
    if record_id:
        record_data = get_record(db, record_id)

    return {
        "error_code": 0,
        "data": {
            "formLayout": form_layout,
            "meta": meta,
            "record": record_data,
        },
    }


@router.get("/app/{entity}/print")
async def api_print_model(
    entity: str,
    record: str = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get print model data.

    Migrated from GeneralModelController.print.
    """
    record_data = None
    if record:
        record_data = get_record(db, record)

    form_layout = get_form_layout(db, entity)
    meta = get_record_meta(db, record) if record else {}

    return {
        "error_code": 0,
        "data": {
            "record": record_data,
            "formLayout": form_layout,
            "meta": meta,
        },
    }


@router.post("/app/{entity}/detail-models")
async def api_detail_models(
    entity: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get detail models for a main record and its detail entities.

    Migrated from GeneralModelController.detail-models.
    """
    body = await request.json()
    record_id = body.get("id")

    if not record_id:
        return {"error_code": 400, "error_msg": "Record ID required"}

    record_data = get_record(db, record_id)
    if not record_data:
        return {"error_code": 404, "error_msg": "Record not found"}

    # Get detail entity models
    detail_entities = get_entities(db)
    details = []
    for de in detail_entities:
        if hasattr(de, 'main_entity') and de.get('main_entity') == entity:
            dr = list_records(
                db, de['entity_name'],
                page_no=1, page_size=50,
            )
            detail_records = dr.get("data", [])
            details.append({
                "entity": de['entity_name'],
                "records": detail_records,
            })

    return {
        "error_code": 0,
        "data": {
            "main": record_data,
            "details": details,
        },
    }


# ══════════════════════════════════════════════════════════════════════
# API endpoints — Model Extras (ModelExtrasController)
# ══════════════════════════════════════════════════════════════════════


@router.get("/app/{entity}/fillin-value")
async def api_fillin_value(
    entity: str,
    field: str = Query(...),
    value: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get auto-fillin value for a reference field.

    Migrated from ModelExtrasController.fillin-value.
    """
    # Look up auto-fillin config and return fillin values
    from app.core.metadata import AutoFillinConfig
    fillins = db.query(AutoFillinConfig).filter(
        AutoFillinConfig.source_field == field,
    ).all()

    result = {}
    for f in fillins:
        result[f.target_field] = f.expression or ""

    return {"error_code": 0, "data": result}


@router.post("/app/{entity}/transform39")
async def api_transform(
    entity: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Transform records using a transform configuration.

    Migrated from ModelExtrasController.transform39.
    """
    body = await request.json()
    trans_id = body.get("transid")
    source_records = body.get("sourceRecords", [])

    # Placeholder — full transform logic requires transform config
    return {"error_code": 0, "data": []}


@router.get("/app/{entity}/record-last-modified")
async def api_record_last_modified(
    entity: str,
    record: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get record last modified timestamp.

    Migrated from ModelExtrasController.record-last-modified.
    """
    record_data = get_record(db, record)
    if not record_data:
        return {"error_code": 404, "error_msg": "Record not found"}

    return {
        "error_code": 0,
        "data": {
            "modifiedOn": record_data.get("modified_on"),
            "modifiedBy": record_data.get("modified_by"),
        },
    }


@router.get("/app/{entity}/record-meta")
async def api_record_meta(
    entity: str,
    record: str = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get record metadata (entity info, field definitions).

    Migrated from ModelExtrasController.record-meta.
    """
    meta = get_record_meta(db, record) if record else {}
    return {"error_code": 0, "data": meta}


@router.get("/app/{entity}/record-history")
async def api_record_history(
    entity: str,
    record: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get revision history for a record.

    Migrated from ModelExtrasController.record-history.
    """
    history = get_record_history(db, record)
    return {"error_code": 0, "data": history}


@router.get("/app/{entity}/check-creates")
async def api_check_creates(
    entity: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Check if the current user can create records of this entity.

    Migrated from ModelExtrasController.check-creates.
    """
    from app.core.privileges import allow, Permission
    can_create = allow(db, str(current_user.user_id), entity, Permission.CREATE)
    return {"error_code": 0, "data": {"canCreate": can_create}}


@router.post("/app/{entity}/eval-calc-formula")
async def api_eval_calc_formula(
    entity: str,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Evaluate a calculation formula.

    Migrated from ModelExtrasController.eval-calc-formula.
    """
    body = await request.json()
    formula = body.get("formula", "")
    data = body.get("data", {})

    # Simple formula evaluation — replace field refs with values
    result = formula
    for key, val in data.items():
        result = result.replace(f"{{{key}}}", str(val))

    return {"error_code": 0, "data": {"result": result}}


# ══════════════════════════════════════════════════════════════════════
# API endpoints — Related List (RelatedListController)
# ══════════════════════════════════════════════════════════════════════


@router.get("/app/{entity}/related-list")
async def api_related_list(
    entity: str,
    record: str = Query(..., alias="mainid"),
    related: str = Query(..., alias="related"),
    page_no: int = Query(1, alias="pageNo"),
    page_size: int = Query(20, alias="pageSize"),
    q: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get related records list.

    Migrated from RelatedListController.related-list.
    """
    # Build filter for related entity
    filter_expr = f"{'$MAINID$' if entity.lower() in ('user', 'department') else 'mainid'}='{record}'"

    result = list_records(
        db, related,
        page_no=page_no, page_size=page_size,
    )
    records = result.get("data", [])
    total = result.get("total", 0)

    return {
        "error_code": 0,
        "data": {
            "total": total,
            "pageNo": page_no,
            "pageSize": page_size,
            "data": records,
        },
    }


@router.get("/app/{entity}/related-counts")
async def api_related_counts(
    entity: str,
    record: str = Query(..., alias="mainid"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get related record counts for all detail entities.

    Migrated from RelatedListController.related-counts.
    """
    detail_entities = get_detail_entities(entity)
    counts = {}
    for de in detail_entities:
        ename = de.entity_name
        r = list_records(
            db, ename,
            page_no=1, page_size=1,
        )
        counts[ename] = r.get("total", 0)

    return {"error_code": 0, "data": counts}


@router.get("/app/{entity}/related-list-config")
async def api_related_list_config(
    entity: str,
    related: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get related list configuration.

    Migrated from RelatedListController.related-list-config.
    """
    list_config = get_list_fields(db, related)
    return {"error_code": 0, "data": list_config}


# ══════════════════════════════════════════════════════════════════════
# API endpoints — Advanced Filters (AdvFilterController)
# ══════════════════════════════════════════════════════════════════════


@router.post("/app/{entity}/advfilter/post")
async def api_advfilter_save(
    entity: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save an advanced filter.

    Migrated from AdvFilterController.advfilter/post.
    """
    body = await request.json()
    name = body.get("name", "")
    filter_items = body.get("filter", [])
    share_to = body.get("shareTo")

    result = save_adv_filter(db, name, entity, filter_items, share_to=share_to, user_id=str(current_user.user_id))
    if isinstance(result, str):
        return {"error_code": 400, "error_msg": result}
    return {"error_code": 0, "data": result}


@router.get("/app/{entity}/advfilter/get")
async def api_advfilter_get(
    entity: str,
    id: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get an advanced filter by ID.

    Migrated from AdvFilterController.advfilter/get.
    """
    result = get_adv_filter(db, id)
    if not result:
        return {"error_code": 404, "error_msg": "Filter not found"}
    return {"error_code": 0, "data": result}


@router.get("/app/{entity}/advfilter/list")
async def api_advfilter_list(
    entity: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List advanced filters for an entity.

    Migrated from AdvFilterController.advfilter/list.
    """
    filters = list_adv_filters(db, entity, str(current_user.user_id))
    return {"error_code": 0, "data": filters}


@router.post("/app/{entity}/advfilter/test-equation")
async def api_advfilter_test(
    entity: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Test an advanced filter equation.

    Migrated from AdvFilterController.advfilter/test-equation.
    """
    body = await request.json()
    filter_items = body.get("filter", [])

    try:
        sql_where = parse_filter_to_sql(entity, filter_items)
        return {"error_code": 0, "data": {"sql": sql_where}}
    except Exception as e:
        return {"error_code": 400, "error_msg": str(e)}


# ══════════════════════════════════════════════════════════════════════
# API endpoints — Metadata (MetadataGetting)
# ══════════════════════════════════════════════════════════════════════


@router.get("/commons/entities")
async def api_entities(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get list of all entities.

    Migrated from MetadataGetting.entities.
    """
    entities = get_entities()
    return {"error_code": 0, "data": [entity_meta_to_dict(e) for e in entities]}


@router.get("/commons/fields")
async def api_fields(
    entity: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get fields for an entity.

    Migrated from MetadataGetting.fields.
    """
    fields = list_fields_as_dicts(db, entity)
    return {"error_code": 0, "data": fields}


@router.get("/commons/references")
async def api_references(
    entity: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get reference fields for an entity.

    Migrated from MetadataGetting.references.
    """
    from app.core.metadata import get_reference_entities
    refs = get_reference_entities(entity)
    return {"error_code": 0, "data": refs}


@router.get("/commons/meta-info")
async def api_meta_info(
    entity: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get entity metadata info.

    Migrated from MetadataGetting.meta-info.
    """
    ent = get_entity(entity)
    fields = list_fields_as_dicts(db, entity) if ent else []
    return {"error_code": 0, "data": {"entity": entity_meta_to_dict(ent), "fields": fields} if ent else {"entity": None, "fields": []}}


@router.get("/commons/entity-and-details")
async def api_entity_and_details(
    entity: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get entity and its detail entities.

    Migrated from MetadataGetting.entity-and-details.
    """
    ent = get_entity(entity)
    details = get_detail_entities(entity)
    detail_list = [entity_meta_to_dict(d) for d in details]

    return {
        "error_code": 0,
        "data": {
            "entity": entity_meta_to_dict(ent) if ent else None,
            "details": detail_list,
        },
    }


# ══════════════════════════════════════════════════════════════════════
# API endpoints — Users (UsersGetting)
# ══════════════════════════════════════════════════════════════════════


@router.get("/commons/users")
async def api_users(
    q: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Search users.

    Migrated from UsersGetting.users.
    """
    results = search_users(db, q)
    return {"error_code": 0, "data": results}


@router.post("/commons/user-selector")
async def api_user_selector(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """User selector data.

    Migrated from UsersGetting.user-selector.
    """
    body = await request.json()
    q = body.get("q")
    entity = body.get("entity")

    results = search_users(db, q)
    return {"error_code": 0, "data": results}
