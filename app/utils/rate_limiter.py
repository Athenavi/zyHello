"""Rate-limiter utilities — replaces RateLimiters.java.

Uses a simple sliding-window approach backed by an in-memory dict.
For production, swap with a Redis-backed implementation.
"""

from __future__ import annotations

import threading
import time
from dataclasses import dataclass, field


@dataclass
class _Window:
    """A sliding window counter."""
    duration: int  # seconds
    limit: int
    timestamps: list[float] = field(default_factory=list)

    def is_allowed(self) -> bool:
        now = time.monotonic()
        cutoff = now - self.duration
        self.timestamps = [t for t in self.timestamps if t > cutoff]
        if len(self.timestamps) < self.limit:
            self.timestamps.append(now)
            return True
        return False


class RateLimiter:
    """In-memory sliding-window rate limiter."""

    def __init__(self, seconds: int | list[int], limits: int | list[int]):
        if isinstance(seconds, int):
            seconds = [seconds]
        if isinstance(targets := limits, int):
            targets = [targets]
        assert len(seconds) == len(targets), "Rule pair does not match"
        self._windows = [_Window(s, l) for s, l in zip(seconds, targets)]
        self._lock = threading.Lock()

    def is_allowed(self) -> bool:
        """Return ``True`` if the request is within all windows."""
        with self._lock:
            return all(w.is_allowed() for w in self._windows)


def create_rate_limiter(seconds: int | list[int], limits: int | list[int]) -> RateLimiter:
    """Factory function matching Java's ``RateLimiters.createRateLimiter``."""
    return RateLimiter(seconds, limits)
