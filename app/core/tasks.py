"""Heavy task management — async task tracking, state, cancellation.

Migrated from Java: com.rebuild.core.support.task.*
Provides a simple in-memory task registry for long-running operations.
"""
from __future__ import annotations

import logging
import threading
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from enum import IntEnum
from typing import Any, Callable, Optional

log = logging.getLogger(__name__)


class TaskState(IntEnum):
    PENDING = 0
    RUNNING = 1
    SUCCEEDED = 2
    FAILED = -1
    CANCELLED = -2


@dataclass
class TaskStateInfo:
    """Task state snapshot."""
    task_id: str
    task_name: str
    state: TaskState
    progress: float = 0.0  # 0-100
    total: int = 0
    completed: int = 0
    message: str = ""
    error: str = ""
    started_on: str | None = None
    completed_on: str | None = None
    elapsed: float = 0.0


class HeavyTask:
    """A long-running background task with progress tracking."""

    def __init__(self, name: str, func: Callable, *args, **kwargs):
        self.task_id = uuid.uuid4().hex[:16]
        self.name = name
        self._func = func
        self._args = args
        self._kwargs = kwargs
        self._state = TaskState.PENDING
        self._progress = 0.0
        self._total = 0
        self._completed = 0
        self._message = ""
        self._error = ""
        self._started_on: datetime | None = None
        self._completed_on: datetime | None = None
        self._thread: threading.Thread | None = None
        self._cancel_flag = False

    @property
    def state(self) -> TaskState:
        return self._state

    @property
    def is_running(self) -> bool:
        return self._state == TaskState.RUNNING

    @property
    def is_completed(self) -> bool:
        return self._state in (TaskState.SUCCEEDED, TaskState.FAILED, TaskState.CANCELLED)

    def start(self) -> None:
        """Start the task in a background thread."""
        if self._state != TaskState.PENDING:
            return
        self._state = TaskState.RUNNING
        self._started_on = datetime.utcnow()
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def _run(self) -> None:
        try:
            result = self._func(self, *self._args, **self._kwargs)
            if self._cancel_flag:
                self._state = TaskState.CANCELLED
            else:
                self._state = TaskState.SUCCEEDED
                self._progress = 100.0
        except Exception as e:
            self._state = TaskState.FAILED
            self._error = str(e)
            log.exception("Task %s failed: %s", self.name, e)
        finally:
            self._completed_on = datetime.utcnow()

    def cancel(self) -> bool:
        """Request cancellation."""
        if self._state == TaskState.RUNNING:
            self._cancel_flag = True
            return True
        return False

    def update(self, completed: int = 0, total: int = 0, message: str = "") -> None:
        """Update task progress (called from within the task function)."""
        if total > 0:
            self._total = total
            self._completed = completed
            self._progress = round(completed / total * 100, 1) if total > 0 else 0
        if message:
            self._message = message

    def is_cancelled(self) -> bool:
        return self._cancel_flag

    def get_state_info(self) -> TaskStateInfo:
        elapsed = 0.0
        if self._started_on:
            end = self._completed_on or datetime.utcnow()
            elapsed = (end - self._started_on).total_seconds()
        return TaskStateInfo(
            task_id=self.task_id,
            task_name=self.name,
            state=self._state,
            progress=self._progress,
            total=self._total,
            completed=self._completed,
            message=self._message,
            error=self._error,
            started_on=self._started_on.isoformat() if self._started_on else None,
            completed_on=self._completed_on.isoformat() if self._completed_on else None,
            elapsed=round(elapsed, 2),
        )


# ── Task registry ────────────────────────────────────────────────────────────

_task_registry: dict[str, HeavyTask] = {}
_registry_lock = threading.Lock()


def submit(name: str, func: Callable, *args, **kwargs) -> HeavyTask:
    """Submit a new background task."""
    task = HeavyTask(name, func, *args, **kwargs)
    with _registry_lock:
        _task_registry[task.task_id] = task
    task.start()
    return task


def get_task(task_id: str) -> Optional[HeavyTask]:
    return _task_registry.get(task_id)


def get_task_state(task_id: str) -> Optional[TaskStateInfo]:
    task = get_task(task_id)
    if not task:
        return None
    return task.get_state_info()


def cancel_task(task_id: str) -> bool:
    task = get_task(task_id)
    if task:
        return task.cancel()
    return False


def list_tasks(states: list[TaskState] = None) -> list[TaskStateInfo]:
    """List all tasks, optionally filtered by state."""
    tasks = list(_task_registry.values())
    if states:
        tasks = [t for t in tasks if t.state in states]
    return [t.get_state_info() for t in sorted(tasks, key=lambda t: t._started_on or datetime.min, reverse=True)]


def cleanup(max_age_seconds: int = 3600) -> int:
    """Remove completed tasks older than max_age."""
    now = datetime.utcnow()
    removed = 0
    with _registry_lock:
        to_remove = []
        for tid, task in _task_registry.items():
            if task.is_completed and task._completed_on:
                age = (now - task._completed_on).total_seconds()
                if age > max_age_seconds:
                    to_remove.append(tid)
        for tid in to_remove:
            del _task_registry[tid]
            removed += 1
    return removed
