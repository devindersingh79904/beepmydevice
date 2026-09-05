"""Request and response contracts for authentication endpoints."""

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from src.utils.constants import MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH


class UserRegisterRequest(BaseModel):
    """Body of POST /auth/register."""

    email: EmailStr
    password: str = Field(min_length=MIN_PASSWORD_LENGTH, max_length=MAX_PASSWORD_LENGTH)


class UserLoginRequest(BaseModel):
    """Body of POST /auth/login."""

    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """Public view of an account. Never includes the password hash."""

    model_config = {"from_attributes": True}

    user_id: uuid.UUID
    email: EmailStr
    created_at: datetime


class AuthTokenResponse(BaseModel):
    """Issued credentials returned by register and login."""

    user_id: uuid.UUID
    token: str
    token_type: str = "Bearer"
    expires_at: datetime


class ChangePasswordRequest(BaseModel):
    """Body of PUT /auth/change-password."""

    current_password: str
    new_password: str = Field(min_length=MIN_PASSWORD_LENGTH, max_length=MAX_PASSWORD_LENGTH)


class ForgotPasswordRequest(BaseModel):
    """Body of POST /auth/forgot-password."""

    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """Body of POST /auth/reset-password."""

    token: str
    new_password: str = Field(min_length=MIN_PASSWORD_LENGTH, max_length=MAX_PASSWORD_LENGTH)


class NotificationPreferences(BaseModel):
    """Notification settings, returned by GET and accepted by PUT /auth/preferences.

    Every field is optional on the way in so a client can send just the toggle
    the user flipped; omitted fields keep their stored value.
    """

    model_config = {"from_attributes": True}

    notifications_enabled: bool | None = None
    sound_enabled: bool | None = None
    vibration_enabled: bool | None = None
    alert_on_silent: bool | None = None
