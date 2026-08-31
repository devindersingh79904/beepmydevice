"""Authentication endpoints: /auth/*."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from src.database import get_db
from src.schemas.user import AuthTokenResponse, UserLoginRequest, UserRegisterRequest
from src.services.auth_service import AuthService
from src.utils.concurrency import run_blocking
from src.utils.constants import AUTH_SCHEME, AUTHORIZATION_HEADER, ErrorCode
from src.utils.logger import get_logger
from src.utils.responses import single_error_response, success_response

logger = get_logger("auth_routes")

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _token_payload(service: AuthService, user_id: Any, token: str) -> dict[str, Any]:
    """Build the credentials block returned by register and login."""
    return AuthTokenResponse(
        user_id=user_id,
        token=token,
        expires_at=service.token_expires_at(),
    ).model_dump(mode="json")


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(
    payload: UserRegisterRequest,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Create an account and return a token.

    Returns the token as well as the user so the client can go straight to
    device registration without a second round trip.
    """
    service = AuthService(db)
    try:
        user_id = await run_blocking(service.register, payload.email, payload.password)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=single_error_response(
                ErrorCode.INVALID_CREDENTIALS,
                status.HTTP_409_CONFLICT,
                field="email",
                message="That email address is already registered",
            ),
        ) from exc

    token = await run_blocking(service.create_token, user_id)
    return success_response(
        _token_payload(service, user_id, token),
        message="Registration successful",
        status_code=status.HTTP_201_CREATED,
    )


@router.post("/login")
async def login(
    payload: UserLoginRequest,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Exchange credentials for a JWT."""
    service = AuthService(db)
    try:
        token = await run_blocking(service.login, payload.email, payload.password)
    except PermissionError as exc:
        # An unknown email and a wrong password return the identical error, so
        # the endpoint cannot be used to discover which addresses are registered.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=single_error_response(
                ErrorCode.INVALID_CREDENTIALS, status.HTTP_401_UNAUTHORIZED
            ),
        ) from exc

    user_id = await run_blocking(service.verify_token, token)
    return success_response(
        _token_payload(service, user_id, token),
        message="Login successful",
    )


@router.post("/logout")
async def logout(request: Request, db: Session = Depends(get_db)) -> dict[str, Any]:
    """Invalidate the caller token."""
    header = request.headers.get(AUTHORIZATION_HEADER, "")
    scheme, _, token = header.partition(" ")
    if scheme.lower() == AUTH_SCHEME.lower() and token.strip():
        await run_blocking(AuthService(db).logout, token.strip())

    # Logging out is idempotent: a request with no usable token has already
    # achieved what the caller asked for, so it is not an error.
    return success_response({}, message="Logged out")
