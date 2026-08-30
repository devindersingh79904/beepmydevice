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
