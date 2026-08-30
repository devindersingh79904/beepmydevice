"""JWT authentication as FastAPI dependencies.

Three dependencies, because the endpoints need three different answers to
"who is calling?":

* :func:`get_current_user_id` -- a signed-in user is required.
* :func:`get_optional_user_id` -- a user if there is one, otherwise ``None``.
  Used only by device registration, where an unauthenticated caller becomes a
  guest rather than being rejected.
* :func:`require_device_access` -- either the owning user's token or the
  device's own token, scoped to one device. Used only by the heartbeat, which
  guests must be able to call.

Implemented as dependencies rather than blanket middleware so public endpoints
simply do not declare one, instead of the middleware needing a path allowlist
to skip them.
"""

import uuid

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from src.database import get_db
from src.utils.logger import get_logger

logger = get_logger("auth_middleware")


async def get_current_user_id(
    request: Request,
    db: Session = Depends(get_db),
) -> uuid.UUID:
    """Resolve the authenticated user from the Authorization header.

    Args:
        request: Incoming request carrying the Bearer token.
        db: Request-scoped database session.

    Returns:
        The authenticated user ID.

    Raises:
        HTTPException: 401 with AUTH_002 when the token is expired, or AUTH_003
            when it is missing or malformed.
    """
    raise NotImplementedError


async def get_optional_user_id(
    request: Request,
    db: Session = Depends(get_db),
) -> uuid.UUID | None:
    """Resolve the user if the request carries a valid token, else ``None``.

    A *missing* token is not an error here -- that is how a guest registers.
    A token that is present but invalid or expired is still rejected, so a
    stale session cannot silently downgrade a user's device into a guest.

    Args:
        request: Incoming request, which may or may not carry a Bearer token.
        db: Request-scoped database session.

    Returns:
        The user ID, or None when no token was supplied.

    Raises:
        HTTPException: 401 with AUTH_002 or AUTH_003 when a token is present
            but not valid.
    """
    raise NotImplementedError


async def require_device_access(
    device_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
) -> None:
    """Authorise a caller to act on one specific device.

    Accepts either the owning user's JWT or the device token issued at guest
    registration. The credential must resolve to *this* ``device_id``: a device
    token is scoped to a single device precisely so that a guest cannot
    heartbeat, or otherwise act, on behalf of any other device on the network.

    Args:
        device_id: Path parameter naming the device being acted on.
        request: Incoming request carrying either credential.
        db: Request-scoped database session.

    Raises:
        HTTPException: 401 with AUTH_003 when neither credential is present or
            valid, or 403 with AUTH_004 when the credential is valid but
            belongs to a different device.
    """
    raise NotImplementedError
