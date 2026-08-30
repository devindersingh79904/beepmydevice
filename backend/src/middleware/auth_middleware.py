"""JWT authentication as a FastAPI dependency."""

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

    Implemented as a dependency rather than blanket middleware so public
    endpoints (register, login) simply do not declare it, instead of the
    middleware needing a path allowlist to skip them.

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
