"""
Block-list / SQL keyword checker — Python equivalent of BlockList.java.

Loads a blocked-word list from `blocklist.json` resource file,
and checks against common SQL keywords.
"""
from __future__ import annotations

import json
from pathlib import Path
from functools import lru_cache
from loguru import logger

# SQL reserved keywords
SQL_KEYWORDS = frozenset({
    "SELECT", "DISTINCT", "MAX", "MIN", "AVG", "SUM", "COUNT", "FROM",
    "WHERE", "AND", "OR", "ORDER", "BY", "ASC", "DESC", "GROUP", "HAVING",
    "WITH", "ROLLUP", "IS", "NOT", "NULL", "IN", "LIKE", "EXISTS",
    "BETWEEN", "TRUE", "FALSE",
})

_blocked_words: set[str] | None = None


def _load_blocklist() -> set[str]:
    """Load blocked words from blocklist.json."""
    global _blocked_words
    if _blocked_words is not None:
        return _blocked_words

    _blocked_words = set()
    try:
        # Try project root first
        for base in [Path(__file__).resolve().parent.parent.parent / "src" / "main" / "resources",
                     Path(__file__).resolve().parent.parent / "resources"]:
            p = base / "blocklist.json"
            if p.exists():
                data = json.loads(p.read_text(encoding="utf-8"))
                if isinstance(data, list):
                    _blocked_words = {w.lower() for w in data if isinstance(w, str)}
                break
    except Exception as e:
        logger.warning("Failed to load blocklist.json: {}", e)

    return _blocked_words


def is_block(text: str) -> bool:
    """Check if text is a blocked word or SQL keyword."""
    blocked = _load_blocklist()
    return text.lower() in blocked or is_sql_keyword(text)


def is_sql_keyword(text: str) -> bool:
    """Check if text is a SQL keyword (case-insensitive)."""
    return text.upper() in SQL_KEYWORDS
