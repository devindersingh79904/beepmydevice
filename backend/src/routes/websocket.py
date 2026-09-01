"""Real-time status endpoint: /ws/*."""

import asyncio
import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from src.services.websocket_manager import WS_POLICY_VIOLATION, WebSocketManager
from src.utils.constants import WS_AUTH_TIMEOUT_SECONDS
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

    # Bounded: the socket is accepted before it is authenticated, so a client
    # that connects and then says nothing would otherwise hold the connection
    # -- and its slot in the registry -- for as long as it liked, without ever
    # presenting a credential.
    try:
        auth_token = await asyncio.wait_for(
            websocket.receive_text(), timeout=WS_AUTH_TIMEOUT_SECONDS
        )
    except WebSocketDisconnect:
        return
    except asyncio.TimeoutError:
        logger.warning(f"WebSocket {client_id} sent no token in time; closing")
        await websocket.close(code=WS_POLICY_VIOLATION)
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
