"""Metadata store import/export — RBStore, Metaschema export/import, classification import.
Migrated from Java: RBStore, MetaschemaExporter, MetaschemaImporter,
ClassificationFileImporter, ClassificationImporter, BusinessModelImporter, RbSystemImporter.
"""
from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime
from typing import Any, Optional

from sqlalchemy.orm import Session
from sqlalchemy import text

logger = logging.getLogger(__name__)

# Default RB-Store base URL (configurable)
DEFAULT_RB_STORE_URL = "https://getrebuild.com/gh/getrebuild/rebuild-datas/"


# ---------------------------------------------------------------------------
# RBStore — remote metadata repository client
# ---------------------------------------------------------------------------

class RBStore:
    """Client for fetching metadata from the RB online store."""

    def __init__(self, base_url: str = None):
        self.base_url = (base_url or DEFAULT_RB_STORE_URL).rstrip("/") + "/"

    def fetch_classification(self, file_uri: str) -> Any:
        """Fetch classification data from the remote store."""
        return self._fetch_json(f"classifications/{file_uri}")

    def fetch_metaschema(self, file_uri: str = None) -> Any:
        """Fetch metaschema definition from the remote store."""
        return self._fetch_json(f"metaschemas/{file_uri or 'index.json'}")

    def fetch_remote_json(self, file_url: str) -> Any:
        """Fetch and parse a JSON file from a remote URL."""
        import urllib.request
        try:
            if not file_url.startswith("http"):
                file_url = self.base_url + file_url.lstrip("/")
            with urllib.request.urlopen(file_url, timeout=30) as resp:
                content = resp.read().decode("utf-8")
                return json.loads(content)
        except Exception as e:
            logger.error("Unable to fetch from URL: %s. Error: %s", file_url, e)
            raise RuntimeError(f"Unable to read data from RB-Store: {e}") from e

    def _fetch_json(self, path: str) -> Any:
        url = self.base_url + path.lstrip("/")
        return self.fetch_remote_json(url)


# ---------------------------------------------------------------------------
# MetaschemaExporter — export entity schema to JSON
# ---------------------------------------------------------------------------

class MetaschemaExporter:
    """Export entity/field metadata to a JSON metaschema format."""

    def __init__(self, db: Session):
        self.db = db

    def export_entity(self, entity_name: str) -> dict:
        """Export a single entity's metadata to metaschema JSON format."""
        entity = self.db.execute(text(
            "SELECT * FROM meta_entity WHERE entity_name = :n"
        ), {"n": entity_name}).fetchone()

        if not entity:
            raise ValueError(f"Entity not found: {entity_name}")

        fields = self.db.execute(text(
            "SELECT * FROM meta_field WHERE entity_name = :e ORDER BY field_id"
        ), {"e": entity_name}).fetchall()

        field_list = []
        for f in fields:
            fd = dict(f._mapping)
            field_entry = {
                "fieldName": fd.get("field_name", ""),
                "fieldLabel": fd.get("field_label", ""),
                "displayType": fd.get("display_type", "TEXT"),
                "nullable": bool(fd.get("nullable", 1)),
                "creatable": bool(fd.get("creatable", 1)),
                "updatable": bool(fd.get("updatable", 1)),
                "repeatable": bool(fd.get("repeatable", 0)),
                "queryable": bool(fd.get("queryable", 1)),
                "defaultValue": fd.get("default_value", ""),
                "refEntity": fd.get("ref_entity", ""),
            }
            if fd.get("extra_attrs"):
                extra = fd["extra_attrs"]
                try:
                    field_entry["extraAttrs"] = json.loads(extra) if isinstance(extra, str) else extra
                except (json.JSONDecodeError, TypeError):
                    pass
            field_list.append(field_entry)

        ed = dict(entity._mapping)
        schema = {
            "entityName": ed.get("entity_name", ""),
            "entityLabel": ed.get("entity_label", ""),
            "fields": field_list,
        }

        # Include details (child entities) if any
        details = self.db.execute(text(
            "SELECT entity_name FROM meta_entity WHERE parent_entity = :m"
        ), {"m": entity_name}).fetchall()
        if details:
            schema["detailEntities"] = [d.entity_name for d in details]

        return schema

    def export_all(self, entity_names: list[str] = None) -> list[dict]:
        """Export multiple entities (or all) to metaschema format."""
        if entity_names is None:
            rows = self.db.execute(text(
                "SELECT entity_name FROM meta_entity ORDER BY entity_id"
            )).fetchall()
            entity_names = [r.entity_name for r in rows]

        schemas = []
        for name in entity_names:
            try:
                schemas.append(self.export_entity(name))
            except Exception as e:
                logger.warning("Failed to export entity %s: %s", name, e)
        return schemas


# ---------------------------------------------------------------------------
# MetaschemaImporter — import entity schema from JSON
# ---------------------------------------------------------------------------

class MetaschemaImporter:
    """Import entity/field metadata from a JSON metaschema."""

    def __init__(self, db: Session):
        self.db = db
        self._task_id = uuid.uuid4().hex
        self._progress = 0
        self._total = 0
        self._errors: list[str] = []

    @property
    def progress(self) -> int:
        return self._progress

    @property
    def errors(self) -> list[str]:
        return self._errors

    def import_metaschema(self, schema: dict | list) -> str:
        """Import one or more entity metaschemas.

        Args:
            schema: A single entity schema dict or a list of them.

        Returns:
            Task ID for tracking.
        """
        if isinstance(schema, list):
            self._total = len(schema)
            for s in schema:
                self._import_one(s)
        else:
            self._total = 1
            self._import_one(schema)

        return self._task_id

    def _import_one(self, schema: dict) -> None:
        entity_name = schema.get("entityName")
        if not entity_name:
            self._errors.append("Schema missing entityName")
            self._progress += 1
            return

        try:
            # Check if entity already exists
            existing = self.db.execute(text(
                "SELECT entity_id FROM meta_entity WHERE entity_name = :n"
            ), {"n": entity_name}).fetchone()

            if existing:
                logger.info("Entity %s already exists, updating fields", entity_name)
                self._update_fields(entity_name, schema.get("fields", []))
            else:
                self._create_entity(schema)

            self.db.commit()
            logger.info("Imported entity %s with %d fields",
                        entity_name, len(schema.get("fields", [])))
        except Exception as e:
            self._errors.append(f"Failed to import {entity_name}: {e}")
            logger.error("Import failed for %s: %s", entity_name, e)
            try:
                self.db.rollback()
            except Exception:
                pass

        self._progress += 1

    def _create_entity(self, schema: dict) -> None:
        entity_name = schema["entityName"]
        entity_id = uuid.uuid4().hex
        entity_code = schema.get("entity_code") or schema.get("entityCode", 0)

        self.db.execute(text(
            "INSERT INTO meta_entity "
            "(entity_id, entity_name, entity_label, physical_name, entity_type, parent_entity, is_disabled, created_on, modified_on) "
            "VALUES (:eid, :en, :el, :pn, 0, :pe, 0, :now, :now)"
        ), {
            "eid": entity_id,
            "en": entity_name,
            "el": schema.get("entityLabel", entity_name),
            "pn": entity_name.lower(),
            "pe": schema.get("mainEntity", ""),
            "now": datetime.utcnow(),
        })

        for f in schema.get("fields", []):
            self._create_field(entity_name, f)

    def _create_field(self, entity_name: str, field_def: dict) -> None:
        field_id = uuid.uuid4().hex
        self.db.execute(text(
            "INSERT INTO meta_field "
            "(field_id, entity_name, field_name, field_label, display_type, field_type, "
            "nullable, creatable, updatable, repeatable, queryable, default_value, "
            "ref_entity, ref_field, comments, is_disabled, created_on, modified_on) "
            "VALUES (:fid, :en, :fn, :fl, :dt, :ft, :nul, :cr, :up, :rep, :q, :dv, :re, :rf, :cm, 0, :now, :now)"
        ), {
            "fid": field_id,
            "fn": field_def.get("fieldName", ""),
            "fl": field_def.get("fieldLabel", ""),
            "dt": field_def.get("displayType", "TEXT"),
            "ft": field_def.get("fieldType", "TEXT"),
            "en": entity_name,
            "nul": 1 if field_def.get("nullable", True) else 0,
            "cr": 1 if field_def.get("creatable", True) else 0,
            "up": 1 if field_def.get("updatable", True) else 0,
            "rep": 1 if field_def.get("repeatable", False) else 0,
            "q": 1 if field_def.get("queryable", True) else 0,
            "dv": field_def.get("defaultValue", ""),
            "re": field_def.get("refEntity", ""),
            "rf": field_def.get("refField", ""),
            "cm": field_def.get("comments", ""),
            "now": datetime.utcnow(),
        })

    def _update_fields(self, entity_name: str, fields: list[dict]) -> None:
        for f in fields:
            fname = f.get("fieldName", "")
            existing = self.db.execute(text(
                "SELECT field_id FROM meta_field WHERE entity_name = :e AND field_name = :f"
            ), {"e": entity_name, "f": fname}).fetchone()

            if not existing:
                self._create_field(entity_name, f)
            # Existing fields are left as-is to avoid overwriting user customizations


# ---------------------------------------------------------------------------
# ClassificationFileImporter — import classifications from Excel/CSV
# ---------------------------------------------------------------------------

class ClassificationFileImporter:
    """Import classification data from a file."""

    def __init__(self, db: Session):
        self.db = db

    def import_from_data(self, data_id: str, rows: list[list[str]]) -> int:
        """Import classification tree from row data.

        Each row is [level1, level2, level3, ...] representing a tree path.
        Returns the number of items imported.
        """
        imported = 0
        parent_map: dict[str, str] = {}

        for row in rows:
            parent_id = None
            for level, name in enumerate(row):
                if not name or not name.strip():
                    continue
                name = name.strip()
                key = "/".join(row[: level + 1])

                if key in parent_map:
                    parent_id = parent_map[key]
                    continue

                item_id = uuid.uuid4().hex
                self.db.execute(text(
                    "INSERT INTO classification_data "
                    "(data_id, item_id, parent_id, name, is_hide, seq, created_on, modified_on) "
                    "VALUES (:did, :iid, :pid, :name, 0, :seq, :now, :now)"
                ), {
                    "did": data_id,
                    "iid": item_id,
                    "pid": parent_id,
                    "name": name,
                    "seq": imported,
                    "now": datetime.utcnow(),
                })
                parent_map[key] = item_id
                parent_id = item_id
                imported += 1

        self.db.commit()
        logger.info("Imported %d classification items for data_id=%s", imported, data_id)
        return imported


# ---------------------------------------------------------------------------
# BusinessModelImporter — import business model templates
# ---------------------------------------------------------------------------

class BusinessModelImporter:
    """Import business model definitions from metaschema data."""

    def __init__(self, db: Session):
        self.db = db

    def import_model(self, schema: dict, user_id: str = None) -> str:
        """Import a business model template.

        Returns the task ID.
        """
        importer = MetaschemaImporter(self.db)
        return importer.import_metaschema(schema)


# ---------------------------------------------------------------------------
# RbSystemImporter — import full system definition
# ---------------------------------------------------------------------------

class RbSystemImporter:
    """Import a complete RB system definition file."""

    def __init__(self, db: Session):
        self.db = db

    def import_system(self, system_data: dict, user_id: str = None) -> dict:
        """Import a system definition containing entities, fields, and configurations.

        Args:
            system_data: System definition dict with 'metaschema', 'classification', etc.

        Returns:
            Summary dict with counts of imported items.
        """
        result = {"entities": 0, "fields": 0, "classifications": 0, "errors": []}

        # Import metaschemas
        schemas = system_data.get("metaschema") or system_data.get("metaschemas", [])
        if schemas:
            importer = MetaschemaImporter(self.db)
            importer.import_metaschema(schemas)
            result["entities"] = len(schemas) if isinstance(schemas, list) else 1
            result["errors"].extend(importer.errors)

        # Import classifications
        classifications = system_data.get("classification") or system_data.get("classifications", [])
        for cls_data in classifications:
            try:
                data_id = cls_data.get("dataId", "")
                rows = cls_data.get("data", [])
                ci = ClassificationFileImporter(self.db)
                count = ci.import_from_data(data_id, rows)
                result["classifications"] += count
            except Exception as e:
                result["errors"].append(f"Classification import error: {e}")

        logger.info("System import complete: %s", result)
        return result
