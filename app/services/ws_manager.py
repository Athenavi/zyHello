"""WebSocket connection manager for real-time notifications.

Manages user WebSocket connections and provides broadcast
methods for pushing notifications to connected clients.
"""
import json
import logging
from typing import Optional

from fastapi import WebSocket

logger = logging.getLogger("rebuild.ws")

# user_id -> list of WebSocket connections
_active_connections: dict[str, list[WebSocket]] = {}


async def connect(user_id: str, websocket: WebSocket) -> None:
    """Accept a WebSocket connection and register it for the user."""
    await websocket.accept()
    if user_id not in _active_connections:
        _active_connections[user_id] = []
    _active_connections[user_id].append(websocket)
    logger.info(f"[WS] User {user_id} connected ({len(_active_connections[user_id])} sessions)")


def disconnect(user_id: str, websocket: WebSocket) -> None:
    """Remove a WebSocket connection for the user."""
    if user_id in _active_connections:
        _active_connections[user_id] = [
            ws for ws in _active_connections[user_id] if ws != websocket
        ]
        if not _active_connections[user_id]:
            del _active_connections[user_id]
    logger.info(f"[WS] User {user_id} disconnected")


async def send_personal_message(user_id: str, message: dict) -> int:
    """Send a message to all connections of a specific user.

    Returns the number of connections the message was sent to.
    """
    if user_id not in _active_connections:
        return 0

    payload = json.dumps(message, ensure_ascii=False)
    sent = 0
    for ws in _active_connections[user_id]:
        try:
            await ws.send_text(payload)
            sent += 1
        except Exception:
            pass
    return sent


async def broadcast_message(message: dict) -> int:
    """Send a message to ALL connected users.

    Returns the total number of connections messaged.
    """
    payload = json.dumps(message, ensure_ascii=False)
    total = 0
    for user_id, connections in list(_active_connections.items()):
        for ws in connections:
            try:
                await ws.send_text(payload)
                total += 1
            except Exception:
                pass
    return total


def get_online_users() -> list[str]:
    """Return list of user_ids that have active WebSocket connections."""
    return list(_active_connections.keys())


def is_user_online(user_id: str) -> bool:
    """Check if a user has any active WebSocket connection."""
    return user_id in _active_connections and bool(_active_connections[user_id])
