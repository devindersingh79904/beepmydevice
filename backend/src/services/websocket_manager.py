"""WebSocket connection registry and status broadcasting."""

import uuid
from datetime import datetime, timezone

from fastapi import WebSocket

from src.services.auth_service import verify_user_token
from src.utils.logger import get_logger

logger = get_logger("websocket_manager")

# Close code 1008 -- "policy violation" -- is the standard way to reject an
# unauthenticated socket without pretending the connection simply dropped.
WS_POLICY_VIOLATION = 1008


class WebSocketManager:
    """Tracks live dashboard connections and pushes status changes to them.

    Held as a single process-wide instance. A multi-process deployment needs a
    shared pub/sub backend such as Redis so a heartbeat handled by one worker
    reaches dashboards connected to another. Deferred to Phase 2.
    """

    def __init__(self) -> None:
        """Initialise an empty connection registry."""
        self._connections: dict[str, WebSocket] = {}
        # Which user each connection belongs to, so a broadcast can be aimed at
        # the one network it concerns instead of every dashboard in the
        # process. Without this, one home's device status would be pushed to
        # every other home connected to the same server.
        self._connection_users: dict[str, uuid.UUID] = {}

    async def connect(self, client_id: str, websocket: WebSocket, auth_token: str) -> bool:
        """Authenticate and accept a connection.

        The token arrives in the first frame rather than a header, because the
        browser WebSocket API cannot set custom headers. The route performs the
        handshake and reads that frame, then hands the token here.

        Returns:
            True if the connection was accepted.
        """
        try:
            user_id = verify_user_token(auth_token)
        except PermissionError:
            logger.warning(f"Rejected unauthenticated WebSocket {client_id}")
            await websocket.close(code=WS_POLICY_VIOLATION)
            return False

        self._connections[client_id] = websocket
        self._connection_users[client_id] = user_id
        logger.info(f"WebSocket {client_id} connected for user {user_id}")
        return True

    async def broadcast_device_update(
        self,
        device_id: uuid.UUID,
        status: str | None,
        battery_level: int | None,
        audience: uuid.UUID | None = None,
    ) -> bool:
        """Push one device's current status and battery to its dashboards.

        The documented frame carries both fields together, so the heartbeat
        path uses this rather than sending two frames the client would have to
        reconcile.

        Args:
            device_id: Device the frame describes.
            status: New status, or None to leave the client's value alone.
            battery_level: New level 0-100, or None if the device reports none.
            audience: User whose dashboards should receive it -- the admin of
                the device's network. Omitting it broadcasts to every connected
                client, which is only correct for process-wide notices.

        Returns:
            True if at least one client received the frame.
        """
        return await self._broadcast(
            {
                "device_id": str(device_id),
                "status": status,
                "battery": battery_level,
                "timestamp": self._now(),
            },
            audience,
        )

    async def _broadcast(self, frame: dict[str, object], audience: uuid.UUID | None) -> bool:
        """Send one frame to the matching clients, dropping any that have gone."""
        targets = [
            client_id
            for client_id in self._connections
            if audience is None or self._connection_users.get(client_id) == audience
        ]

        delivered = 0
        for client_id in targets:
            websocket = self._connections.get(client_id)
            if websocket is None:
                continue
            try:
                await websocket.send_json(frame)
                delivered += 1
            except Exception:  # pylint: disable=broad-exception-caught
                # A send failure means the peer is gone. Reap it here rather
                # than letting dead sockets accumulate for the process lifetime.
                logger.info(f"Dropping dead WebSocket {client_id}")
                await self.disconnect(client_id)
        return delivered > 0

    async def disconnect(self, client_id: str) -> bool:
        """Drop a connection and remove it from the registry."""
        self._connections.pop(client_id, None)
        removed = self._connection_users.pop(client_id, None) is not None
        if removed:
            logger.info(f"WebSocket {client_id} disconnected")
        return removed

    @staticmethod
    def _now() -> str:
        """Return the current UTC time as an ISO-8601 string."""
        return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
