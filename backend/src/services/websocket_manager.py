"""WebSocket connection registry and status broadcasting."""

import uuid

from fastapi import WebSocket

from src.utils.logger import get_logger

logger = get_logger("websocket_manager")


class WebSocketManager:
    """Tracks live dashboard connections and pushes status changes to them.

    Held as a single process-wide instance. A multi-process deployment needs a
    shared pub/sub backend such as Redis so a heartbeat handled by one worker
    reaches dashboards connected to another. Deferred to Phase 2.
    """

    def __init__(self) -> None:
        """Initialise an empty connection registry."""
        self._connections: dict[str, WebSocket] = {}

    async def connect(self, client_id: str, websocket: WebSocket, auth_token: str) -> bool:
        """Authenticate and accept a connection.

        The token arrives in the first frame rather than a header, because the
        browser WebSocket API cannot set custom headers.

        Returns:
            True if the connection was accepted.
        """
        raise NotImplementedError

    async def broadcast_device_status(self, device_id: uuid.UUID, status: str) -> bool:
        """Push an online/offline change to every connected dashboard."""
        raise NotImplementedError

    async def broadcast_battery_update(self, device_id: uuid.UUID, battery_level: int) -> bool:
        """Push a battery-level change to every connected dashboard."""
        raise NotImplementedError

    async def disconnect(self, client_id: str) -> bool:
        """Drop a connection and remove it from the registry."""
        raise NotImplementedError

    def get_connected_clients(self) -> list[str]:
        """Return the IDs of all currently connected clients."""
        raise NotImplementedError
