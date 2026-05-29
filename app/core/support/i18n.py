"""Internationalization (i18n) — language bundle management.

Migrated from Java: com.rebuild.core.support.i18n.Language,
com.rebuild.core.support.i18n.LanguageBundle,
com.rebuild.core.support.i18n.I18nUtils.
Loads language JSON files from classpath and data directory.
"""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Optional

log = logging.getLogger(__name__)


# ── LanguageBundle ──────────────────────────────────────────────────────────

SYS_LC = "SYSTEM"
SYS_BUNDLE_LANG: dict[str, str] = {}


class LanguageBundle:
    """A bundle of language key-value pairs for a specific locale."""

    def __init__(self, locale: str, data: dict[str, str]):
        self.locale = locale
        self.data = data or {}

    def L(self, key: str, *placeholders: Any) -> str:
        """Get a language string with optional placeholders."""
        lang = self.get_lang(key)
        if lang is None:
            return key  # fallback to key itself

        if placeholders:
            try:
                # Java-style {0} {1} placeholders
                for i, ph in enumerate(placeholders):
                    lang = lang.replace(f"{{{i}}}", str(ph))
            except Exception:
                pass
        return lang

    def get_lang(self, key: str) -> Optional[str]:
        """Get raw lang string for key."""
        if key is None:
            return None
        return self.data.get(key)


SYS_BUNDLE = LanguageBundle(SYS_LC, SYS_BUNDLE_LANG)


# ── Language (singleton) ───────────────────────────────────────────────────

class Language:
    """Multi-language manager. Loads lang.*.json bundles."""

    _instance: Optional[Language] = None

    def __init__(self):
        self.bundles: dict[str, LanguageBundle] = {SYS_LC: SYS_BUNDLE}
        self._init_bundles()

    @classmethod
    def instance(cls) -> Language:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _init_bundles(self) -> None:
        """Load language bundles from i18n/ directory and data directory."""
        # Load from project i18n directory
        i18n_dir = Path(__file__).resolve().parents[3] / "src" / "main" / "resources" / "i18n"
        if i18n_dir.is_dir():
            for f in i18n_dir.glob("lang.*.json"):
                self._load_bundle_file(f)

        # Load from data directory
        try:
            from app.core.support.config import get_file_of_data
            data_i18n = get_file_of_data("_i18n")
            if data_i18n.is_dir():
                for f in data_i18n.glob("lang.*.json"):
                    self._load_bundle_file(f)
        except Exception:
            pass

    def _load_bundle_file(self, filepath: Path) -> None:
        """Load a single language bundle file."""
        try:
            locale = filepath.name.split(".")[1]
            with open(filepath, "r", encoding="utf-8") as f:
                data = json.load(f)
            bundle = LanguageBundle(locale, data)
            self.bundles[locale] = bundle
            log.info("Loaded language bundle: %s (%d keys)", filepath.name, len(data))
        except Exception as e:
            log.error("Cannot load language bundle: %s", filepath, e)

    def refresh(self) -> None:
        """Refresh all language bundles."""
        if not self.bundles:
            return
        try:
            self._init_bundles()
        except Exception as e:
            log.error("Refresh language-bundle error", e)

    def get_bundle(self, locale: Optional[str] = None) -> LanguageBundle:
        """Get bundle for locale, falling back to default."""
        if locale and locale in self.bundles:
            return self.bundles[locale]

        if locale:
            # Try language code only (e.g., "zh" from "zh_CN")
            base = locale.split("-")[0].split("_")[0]
            found = self._use_language_code(base)
            if found:
                return self.bundles[found]

        return self.get_default_bundle()

    def get_default_bundle(self) -> LanguageBundle:
        """Get default bundle based on DefaultLanguage config."""
        try:
            from app.core.support.config import get_config, ConfigurationItem
            d = get_config(ConfigurationItem.DefaultLanguage)
            if d and self.available(d):
                return self.bundles[d]
        except Exception:
            pass
        return SYS_BUNDLE

    def _use_language_code(self, locale: str) -> Optional[str]:
        for key in self.bundles:
            if key == locale or key.startswith(locale):
                return key
        return None

    def available(self, locale: Optional[str] = None) -> Optional[str]:
        """Check if locale is available, returns normalized locale or None."""
        if not locale:
            try:
                from app.core.support.config import get_config, ConfigurationItem
                locale = get_config(ConfigurationItem.DefaultLanguage)
            except Exception:
                pass
        if not locale:
            return None

        parts = locale.replace("-", "_").split("_")
        lc = parts[0].lower()
        if len(parts) > 1:
            lc += "_" + parts[1].upper()

        if lc in self.bundles:
            return lc

        found = self._use_language_code(parts[0])
        return found

    def available_locales(self) -> dict[str, str]:
        """Map of locale code -> locale name."""
        return {
            k: v.L("_")
            for k, v in sorted(self.bundles.items())
            if k != SYS_LC
        }

    # ── Quick static methods ──

    @staticmethod
    def get_default() -> LanguageBundle:
        return Language.instance().get_default_bundle()

    @staticmethod
    def get_current(locale: Optional[str] = None) -> LanguageBundle:
        return Language.instance().get_bundle(locale)

    @staticmethod
    def L(key: str, *placeholders: Any) -> str:
        """Translate a key using the current bundle."""
        return Language.get_current().L(key, *placeholders)

    @staticmethod
    def L_meta(entity_name: str, field_name: Optional[str] = None, description: Optional[str] = None) -> str:
        """Translate a metadata item (entity or field label)."""
        bundle = Language.get_current()
        if field_name:
            key = f"META.{entity_name}.{field_name}".upper()
        else:
            key = f"META.{entity_name}".upper()

        lang = bundle.get_lang(key)
        if lang is None and description:
            lang = bundle.get_lang(description)
        return lang or description or entity_name


# ── I18nUtils ──────────────────────────────────────────────────────────────

def get_i18n_value(locale: str, key: str) -> Optional[str]:
    """Get i18n value for a locale and key."""
    bundle = Language.instance().get_bundle(locale)
    val = bundle.get_lang(key)
    return val


def format_i18n(locale: str, key: str, *args: Any) -> str:
    """Format an i18n string with placeholders."""
    bundle = Language.instance().get_bundle(locale)
    return bundle.L(key, *args)
