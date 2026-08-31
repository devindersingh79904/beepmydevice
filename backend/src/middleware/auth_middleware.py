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

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from src.database import get_db
from src.services.auth_service import (
    AuthService,
    TokenExpiredError,
    TokenInvalidError,
)
from src.services.device_service import DeviceService
from src.utils.concurrency import run_blocking
from src.utils.constants import AUTH_SCHEME, AUTHORIZATION_HEADER, ErrorCode
from src.utils.logger import get_logger
from src.utils.responses import single_error_response

logger = get_logger("auth_middleware")


def _extract_bearer_token(request: Request) -> str | None:
    """Return the Bearer token from the Authorization header, or None."""
    header = request.headers.get(AUTHORIZATION_HEADER)
    if not header:
        return None

    scheme, _, token = header.partition(" ")
    if scheme.lower() != AUTH_SCHEME.lower() or not token.strip():
        return None
    return token.strip()


def _unauthorized(code: ErrorCode) -> HTTPException:
    """Build a 401 carrying the standard error envelope."""
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=single_error_response(code, status.HTTP_401_UNAUTHORIZED),
    )


def _forbidden(code: ErrorCode) -> HTTPException:
    """Build a 403 carrying the standard error envelope."""
    return HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=single_error_response(code, status.HTTP_403_FORBIDDEN),
    )


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
    token = _extract_bearer_token(request)
    if token is None:
        raise _unauthorized(ErrorCode.TOKEN_INVALID)

    service = AuthService(db)
    try:
        return await run_blocking(service.verify_token, token)
    except TokenExpiredError as exc:
        raise _unauthorized(ErrorCode.TOKEN_EXPIRED) from exc
    except TokenInvalidError as exc:
        raise _unauthorized(ErrorCode.TOKEN_INVALID) from exc


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
    if _extract_bearer_token(request) is None:
        return None
    return await get_current_user_id(request, db)


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
    token = _extract_bearer_token(request)
    if token is None:
        raise _unauthorized(ErrorCode.TOKEN_INVALID)

    # The device token is tried first: it is the narrower credential, and it is
    # what a guest -- the only caller with no account -- will be presenting.
    if _authorize_device_token(token, device_id):
        return
    await _authorize_owning_user(token, device_id, db)


def _authorize_device_token(token: str, device_id: uuid.UUID) -> bool:
    """Return True if a device token authorises this device.

    Returns False when the token is not a device token at all, so the caller
    can fall through to user authentication.

    Raises:
        HTTPException: 401 when the device token has expired, or 403 when it is
            valid but scoped to a different device.
    """
    try:
        scoped_device_id = DeviceService.verify_device_token(token)
    except TokenExpiredError as exc:
        raise _unauthorized(ErrorCode.TOKEN_EXPIRED) from exc
    except TokenInvalidError:
        return False

    if scoped_device_id != device_id:
        logger.warning(f"Device token for {scoped_device_id} tried to act on {device_id}")
        raise _forbidden(ErrorCode.UNAUTHORIZED)
    return True


async def _authorize_owning_user(token: str, device_id: uuid.UUID, db: Session) -> None:
    """Authorise the device's owner by their user token.

    Raises:
        HTTPException: 401 when the token is invalid or expired, 403 when the
            user does not own this device.
    """
    try:
        user_id = await run_blocking(AuthService(db).verify_token, token)
    except TokenExpiredError as exc:
        raise _unauthorized(ErrorCode.TOKEN_EXPIRED) from exc
    except TokenInvalidError as exc:
        raise _unauthorized(ErrorCode.TOKEN_INVALID) from exc

    try:
        device = await run_blocking(DeviceService(db).get_device, device_id)
    except LookupError as exc:
        # Reported as a permission failure rather than 404 so an unauthenticated
        # caller cannot probe which device IDs exist.
        raise _forbidden(ErrorCode.UNAUTHORIZED) from exc

    if device.user_id != user_id:
        logger.warning(f"User {user_id} tried to act on device {device_id} they do not own")
        raise _forbidden(ErrorCode.UNAUTHORIZED)


async def get_sending_user_id(
    request: Request,
    db: Session = Depends(get_db),
) -> uuid.UUID:
    """Resolve the user permitted to send alerts.

    Identical to :func:`get_current_user_id` except that a *device* token gets
    its own answer. A guest presenting the token it was issued at registration
    is not sending a malformed credential -- it is sending a valid one that is
    simply not allowed to do this -- and saying so with ALERT_005 lets the app
    explain why instead of bouncing the user to a login screen, which is what
    an AUTH_* code means.

    Raises:
        HTTPException: 403 with ALERT_005 when a device token is presented,
            otherwise whatever :func:`get_current_user_id` raises.
    """
    token = _extract_bearer_token(request)
    if token is not None:
        try:
            DeviceService.verify_device_token(token)
        except PermissionError:
            pass  # Not a device token; fall through to normal user auth.
        else:
            logger.warning("Guest device token attempted to send an alert")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=single_error_response(
                    ErrorCode.GUEST_CANNOT_SEND, status.HTTP_403_FORBIDDEN
                ),
            )

    return await get_current_user_id(request, db)
