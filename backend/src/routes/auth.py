"""Authentication endpoints: /auth/*."""

from typing import Any

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from src.database import get_db
from src.schemas.user import UserLoginRequest, UserRegisterRequest
from src.utils.logger import get_logger

logger = get_logger("auth_routes")

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(
    payload: UserRegisterRequest,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Create an account and return a token.

    Returns the token as well as the user so the client can go straight to
    device registration without a second round trip.
    """
    raise NotImplementedError


@router.post("/login")
async def login(
    payload: UserLoginRequest,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Exchange credentials for a JWT."""
    raise NotImplementedError


@router.post("/logout")
async def logout(db: Session = Depends(get_db)) -> dict[str, Any]:
    """Invalidate the caller token."""
    raise NotImplementedError
