"""Authentication endpoints: /auth/*."""

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from src.config import settings
from src.database import get_db
from src.middleware.auth_middleware import get_current_user_id
from src.schemas.user import (
    AuthTokenResponse,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    NotificationPreferences,
    ResetPasswordRequest,
    UserLoginRequest,
    UserRegisterRequest,
)
from src.services.auth_service import AuthService
from src.utils.email import send_password_reset
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


@router.put("/change-password")
async def change_password(
    payload: ChangePasswordRequest,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Replace the caller's password.

    The current password is required as well as the new one: without it, a
    stolen but still-valid token would be enough to lock the real owner out.
    """
    service = AuthService(db)
    try:
        await run_blocking(
            service.change_password,
            user_id,
            payload.current_password,
            payload.new_password,
        )
    except PermissionError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=single_error_response(
                ErrorCode.INVALID_CREDENTIALS,
                status.HTTP_401_UNAUTHORIZED,
                field="current_password",
                message="Current password is incorrect",
            ),
        ) from exc
    except LookupError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=single_error_response(ErrorCode.TOKEN_INVALID, status.HTTP_401_UNAUTHORIZED),
        ) from exc

    return success_response({}, message="Password changed")


@router.post("/forgot-password")
async def forgot_password(
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Email a single-use password reset link.

    Always reports success, whether or not the address is registered. Saying
    "no such account" here would turn this endpoint into the account
    enumerator that /auth/login deliberately is not.
    """
    service = AuthService(db)
    issued = await run_blocking(service.begin_password_reset, payload.email)

    if issued is not None:
        recipient, raw_token = issued
        reset_url = f"{settings.PASSWORD_RESET_URL_BASE}?token={raw_token}"
        await run_blocking(send_password_reset, recipient, reset_url)

    return success_response(
        {}, message="If that address has an account, a reset link is on its way"
    )


@router.post("/reset-password")
async def reset_password(
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Consume a reset token and set a new password."""
    service = AuthService(db)
    try:
        await run_blocking(service.reset_password, payload.token, payload.new_password)
    except PermissionError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=single_error_response(
                ErrorCode.TOKEN_INVALID,
                status.HTTP_400_BAD_REQUEST,
                field="token",
                message=str(exc),
            ),
        ) from exc

    return success_response({}, message="Password reset")


@router.get("/preferences")
async def get_preferences(
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Return the caller's notification preferences."""
    user = await run_blocking(AuthService(db).get_preferences, user_id)
    return success_response(
        NotificationPreferences.model_validate(user).model_dump(mode="json"),
        message="Preferences retrieved",
    )


@router.put("/preferences")
async def update_preferences(
    payload: NotificationPreferences,
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Update the caller's notification preferences.

    Only the fields present in the body are written, so a client can send the
    single toggle the user flipped without clobbering a change made elsewhere.
    """
    user = await run_blocking(
        AuthService(db).update_preferences,
        user_id,
        payload.notifications_enabled,
        payload.sound_enabled,
        payload.vibration_enabled,
        payload.alert_on_silent,
    )
    return success_response(
        NotificationPreferences.model_validate(user).model_dump(mode="json"),
        message="Preferences updated",
    )
