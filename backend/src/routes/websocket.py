"""Real-time status endpoint: /ws/*."""

from fastapi import APIRouter, WebSocket

from src.services.websocket_manager import WebSocketManager
from src.utils.logger import get_logger

logger = get_logger("websocket_routes")

router = APIRouter(tags=["WebSocket"])

# One registry per process, shared by every connection.
manager = WebSocketManager()


@router.websocket("/ws/status")
async def status_socket(websocket: WebSocket) -> None:
    """Stream device status and battery updates to a dashboard.

    The client sends its JWT as the first message after connecting, because the
    WebSocket handshake cannot carry an Authorization header. An unauthenticated
    socket is closed immediately.

    Frames pushed to the client carry device_id, status, battery and timestamp.
    """
    raise NotImplementedError
