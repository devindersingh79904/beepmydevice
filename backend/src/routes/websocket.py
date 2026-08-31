"""Real-time status endpoint: /ws/*."""

import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

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
    # The handshake has to complete before any frame can be read, so the socket
    # is accepted first and authenticated immediately afterwards.
    await websocket.accept()
    client_id = str(uuid.uuid4())

    try:
        auth_token = await websocket.receive_text()
    except WebSocketDisconnect:
        return

    if not await manager.connect(client_id, websocket, auth_token):
        return

    try:
        while True:
            # Nothing is expected from the client after the token; this read
            # exists to notice the disconnect. Any frame sent is ignored.
            await websocket.receive_text()
    except WebSocketDisconnect:
        logger.info(f"WebSocket {client_id} closed by client")
    finally:
        await manager.disconnect(client_id)
