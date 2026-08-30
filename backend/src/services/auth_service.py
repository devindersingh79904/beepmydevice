"""Authentication: registration, login, token issue and verification."""

import uuid

from sqlalchemy.orm import Session

from src.utils.logger import get_logger

logger = get_logger("auth_service")


class AuthService:
    """Owns account creation, credential checking and JWT lifecycle.

    Deliberately knows nothing about devices, alerts or push notifications.
    It only answers the question: who is this request from?
    """

    def __init__(self, db: Session) -> None:
        """Store the injected session.

        Args:
            db: Request-scoped database session.
        """
        self._db = db

    def register(self, email: str, password: str) -> uuid.UUID:
        """Create an account and return its ID.

        Args:
            email: Address to register, must not already exist.
            password: Plain-text password; hashed before storage.

        Returns:
            The new user's ID.

        Raises:
            ValueError: If the email is already registered.
        """
        raise NotImplementedError

    def login(self, email: str, password: str) -> str:
        """Verify credentials and return a signed JWT.

        Args:
            email: Registered email address.
            password: Plain-text password checked against the stored hash.

        Returns:
            A signed JWT valid for ACCESS_TOKEN_EXPIRE_DAYS.

        Raises:
            PermissionError: If the credentials do not match.
        """
        raise NotImplementedError

    def verify_token(self, token: str) -> uuid.UUID:
        """Decode a JWT and return the user it identifies.

        Args:
            token: Bearer token from the Authorization header.

        Returns:
            The authenticated user's ID.

        Raises:
            PermissionError: If the token is expired, malformed or unsigned.
        """
        raise NotImplementedError

    def logout(self, token: str) -> bool:
        """Invalidate a token.

        Returns:
            True once the token can no longer authenticate a request.
        """
        raise NotImplementedError

    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a plain-text password with bcrypt."""
        raise NotImplementedError

    @staticmethod
    def verify_password(password: str, password_hash: str) -> bool:
        """Check a plain-text password against a bcrypt hash."""
        raise NotImplementedError
