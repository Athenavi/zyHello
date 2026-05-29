"""Cache abstraction layer -- Redis + in-memory LRU fallback.

Migrated from Java: BaseCacheTemplate, CacheTemplate, CommonsCache,
EchacheDriver, RedisDriver.
"""
from __future__ import annotations

import json
import time
import logging
from typing import Any, Optional
from threading import Lock

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------------
# In-memory LRU cache (replaces EhcacheDriver)
# ----------------------------------------------------------------------------------

class _LRUCache:
    """Thread-safe LRU cache with TTL support."""

    def __init__(self, max_size: int = 2048, default_ttl: int = 600):
        self._max = max_size
        self._ttl = default_ttl
        self._store: dict[str, tuple[float, Any]] = {}
        self._lock = Lock()

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            expires_at, value = entry
            if time.time() > expires_at:
                del self._store[key]
                return None
            return value

    def put(self, key: str, value: Any, ttl: int | None = None)->None:
        with self._lock:
            if len(self._store) >= self._max:
                oldest = min(self._store, key=lambda k: self._store[k][0])
                del self._store[oldest]
            self._store[key] = (time.time() + (ttl or self._ttl), value)

    def evict(self, key: str)->None:
        with self._lock:
            self._store.pop(key, None)

    def clear(self)->None:
        with self._lock:
            self._store.clear()


# Global local cache instance
_local_cache = _LRUCache()


# ----------------------------------------------------------------------------------
# CacheTemplate -- primary cache interface
# ----------------------------------------------------------------------------------

class CacheTemplate:
    """Unified cache interface with optional Redis backend."""

    def __init__(self, cache_name: str = "default", use_redis: bool = False):
        self._name = cache_name
        self._use_redis = use_redis
        self._redis_client = None

    def get(self, key: str) -> Optional[Any]:
        if self._use_redis and self._redis_client:
            try:
                raw = self._redis_client.get(key)
                return json.loads(raw) if raw else None
            except Exception:
                logger.debug("Redis get failed, falling back to local cache")
        return _local_cache.get(key)

    def put(self, key: str, value: Any, ttl: int | None = None)->None:
        _local_cache.put(key, value, ttl)
        if self._use_redis and self._redis_client:
            try:
                self._redis_client.setex(
                    key, ttl or 600, json.dumps(value, default=str)
                )
            except Exception:
                logger.debug("Redis put failed")

    def evict(self, key: str)->None:
        _local_cache.evict(key)
        if self._use_redis and self._redis_client:
            try:
                self._redis_client.delete(key)
            except Exception:
                pass

    def get_json(self, key: str)->Optional[dict]:
        val = self.get(key)
        if isinstance(val, str):
            try:
                return json.loads(val)
            except (json.JSONDecodeError, TypeError):
                return None
        return val if isinstance(val, dict) else None

    def put_json(self, key: str, value: dict, ttl: int | None = None)->None:
        self.put(key, value, ttl)


# ----------------------------------------------------------------------------------
# CommonsCache -- singleton for general-purpose caching
# ----------------------------------------------------------------------------------

_commons_cache = CacheTemplate("commons")


def get_commons_cache()->CacheTemplate:
    return _commons_cache


def get_kv_string(key: str, default: str = "")->str:
    val = _commons_cache.get(key)
    return str(val) if val is not None else default


def set_kv_string(key: str, value: str)->None:
    _commons_cache.put(key, value)
