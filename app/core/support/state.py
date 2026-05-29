"""State management — enum-based state definitions for approval, workflow, etc.

Migrated from Java: com.rebuild.core.support.state.StateHelper,
com.rebuild.core.support.state.StateSpec,
com.rebuild.core.support.state.StateManager,
com.rebuild.core.support.state.HowtoState.
"""
from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from enum import Enum, IntEnum
from typing import Optional

log = logging.getLogger(__name__)


# ── StateSpec (interface) ───────────────────────────────────────────────────

class StateSpec(ABC):
    """Interface for state enums. Each state has a numeric code and display name."""

    @property
    @abstractmethod
    def state(self) -> int:
        """Numeric state value."""
        ...

    @property
    @abstractmethod
    def name(self) -> str:
        """Display name."""
        ...


# ── Approval states ────────────────────────────────────────────────────────

class ApprovalState(IntEnum):
    """Approval workflow states."""
    DRAFT = 0
    PROCESSING = 1
    APPROVED = 2
    REJECTED = 3
    REVOKED = 4
    CANCELLED = 5

    @property
    def state(self) -> int:
        return self.value

    def get_label(self) -> str:
        labels = {
            0: "草稿",
            1: "审批中",
            2: "已通过",
            3: "已驳回",
            4: "已撤回",
            5: "已取消",
        }
        return labels.get(self.value, f"State({self.value})")


# ── HowtoState (example custom state) ──────────────────────────────────────

class HowtoState(IntEnum):
    """Example custom state enum for howto/tutorial tracking."""
    NOT_STARTED = 0
    IN_PROGRESS = 1
    COMPLETED = 2

    @property
    def state(self) -> int:
        return self.value

    def get_label(self) -> str:
        labels = {0: "未开始", 1: "进行中", 2: "已完成"}
        return labels.get(self.value, f"State({self.value})")


# ── State class registry ───────────────────────────────────────────────────

_STATE_CLASSES: dict[str, type] = {
    "ApprovalState": ApprovalState,
    "HowtoState": HowtoState,
}


def register_state_class(name: str, cls: type) -> None:
    """Register a custom state enum class."""
    _STATE_CLASSES[name] = cls


def is_state_class(class_name: str) -> bool:
    """Check if a class name is a valid state class."""
    try:
        get_state_class(class_name)
        return True
    except (ValueError, KeyError):
        return False


def get_state_class(class_name: str) -> type:
    """Load a state enum class by name."""
    if not class_name:
        raise ValueError("[stateClass] cannot be null")

    # Fix legacy name
    if class_name.lower() == "com.rebuild.server.helper.state.howtostate":
        class_name = "HowtoState"

    # Try direct registry lookup
    if class_name in _STATE_CLASSES:
        return _STATE_CLASSES[class_name]

    # Try by simple class name
    simple = class_name.rsplit(".", 1)[-1] if "." in class_name else class_name
    if simple in _STATE_CLASSES:
        return _STATE_CLASSES[simple]

    raise ValueError(f"No state class found: {class_name}")


def state_value_of(class_name: str, state: int) -> StateSpec:
    """Get a state spec by class name and numeric value."""
    cls = get_state_class(class_name)
    return value_of(cls, state)


def value_of(state_class: type, state: int) -> StateSpec:
    """Get a state spec by class and numeric value."""
    for member in state_class:
        if member.state == state:
            return member
    raise ValueError(f"state={state} not found in {state_class.__name__}")


def get_state_label(field_name: str, state: int) -> str:
    """Get state label for a field, returns '[DELETED]' if not found."""
    try:
        spec = state_value_of(field_name, state)
        return spec.name if hasattr(spec, 'name') else str(spec)
    except (ValueError, KeyError):
        return "[DELETED]"


# ── StateManager ───────────────────────────────────────────────────────────

class StateManager:
    """Manages state class instances and provides lookup utilities."""

    _instance: Optional[StateManager] = None

    def __init__(self):
        self._states: dict[str, type] = dict(_STATE_CLASSES)

    @classmethod
    def instance(cls) -> StateManager:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def get_state_class(self, class_name: str) -> type:
        return get_state_class(class_name)

    def is_state_class(self, class_name: str) -> bool:
        return is_state_class(class_name)

    def value_of(self, class_name: str, state: int) -> StateSpec:
        return state_value_of(class_name, state)

    def get_label(self, class_name: str, state: int) -> str:
        return get_state_label(class_name, state)
