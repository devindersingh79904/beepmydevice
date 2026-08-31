"""Authentication: registration, login, token issue and verification."""

import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import ExpiredSignatureError, JWTError, jwt
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.config import settings
from src.models.user import User
from src.utils.constants import BCRYPT_ROUNDS
from src.utils.logger import get_logger

logger = get_logger("auth_service")

# bcrypt hashes at most 72 bytes and raises on anything longer, while
# MAX_PASSWORD_LENGTH allows 128 characters. Truncating here matches the
# historical bcrypt behaviour every other implementation relies on.
BCRYPT_MAX_BYTES = 72

# Revoked token IDs, held in process memory.
#
# A JWT is self-contained, so the only way to retire one before it expires is
# to remember that it was retired. This set is per-process and is lost on
# restart -- the same constraint WebSocketManager has, and it lifts the same
# way, with a shared Redis store in Phase 2. Until then the API runs a single
# worker, so a revoked token is genuinely rejected everywhere it could be used.
_revoked_token_ids: set[str] = set()


class TokenExpiredError(PermissionError):
    """A token was well-formed and correctly signed, but has expired.

    Subclasses PermissionError so callers that only care that authentication
    failed can still catch the base type, while the middleware can tell an
    expired session (AUTH_002 -- log in again) from a bad one (AUTH_003).
    """


class TokenInvalidError(PermissionError):
    """A token was missing, malformed, revoked, or of the wrong type."""


def verify_user_token(token: str) -> uuid.UUID:
    """Decode a user JWT and return its subject.

    Module-level because verifying a token touches no database: the WebSocket
    handshake authenticates before any session exists, and should not have to
    open one just to read a signature.

    Raises:
        PermissionError: If the token is expired, malformed, revoked, or is a
            device token rather than a user token.
    """
    try:
        claims = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except ExpiredSignatureError as exc:
        raise TokenExpiredError("Token has expired") from exc
    except JWTError as exc:
        raise TokenInvalidError("Invalid token") from exc

    # A device token authorises one heartbeat and nothing else. Rejecting it
    # here stops it being presented anywhere a user token is expected.
    if claims.get("type") != "user":
        raise TokenInvalidError("Token is not a user token")

    if claims.get("jti") in _revoked_token_ids:
        raise TokenInvalidError("Token has been revoked")

    subject = claims.get("sub")
    if not subject:
        raise TokenInvalidError("Token carries no subject")

    try:
        return uuid.UUID(subject)
    except ValueError as exc:
        raise TokenInvalidError("Token subject is not a user ID") from exc


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
        normalized_email = email.strip().lower()
        user = User(
            email=normalized_email,
            password_hash=self.hash_password(password),
        )
        self._db.add(user)
        try:
            # Flush rather than commit: the request-scoped session in get_db
            # owns the transaction boundary, so a later failure in the same
            # request still rolls the account back.
            self._db.flush()
        except IntegrityError as exc:
            self._db.rollback()
            logger.warning(f"Registration rejected, email already exists: {normalized_email}")
            raise ValueError("Email already registered") from exc

        logger.info(f"Registered user {user.user_id}")
        return user.user_id

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
        normalized_email = email.strip().lower()
        user = self._db.execute(
            select(User).where(User.email == normalized_email)
        ).scalar_one_or_none()

        # Verify against a dummy hash when the account is missing, so a
        # non-existent email takes the same time as a wrong password and the
        # endpoint cannot be used to enumerate registered addresses.
        password_hash = user.password_hash if user else self.hash_password("invalid")
        password_matches = self.verify_password(password, password_hash)

        if user is None or not password_matches:
            logger.warning(f"Failed login for {normalized_email}")
            raise PermissionError("Invalid email or password")

        logger.info(f"User {user.user_id} logged in")
        return self.create_token(user.user_id)

    def create_token(self, user_id: uuid.UUID) -> str:
        """Sign a JWT identifying one user.

        Args:
            user_id: Subject of the token.

        Returns:
            The encoded JWT.
        """
        issued_at = datetime.now(timezone.utc)
        expires_at = issued_at + timedelta(days=settings.ACCESS_TOKEN_EXPIRE_DAYS)
        claims = {
            "sub": str(user_id),
            "type": "user",
            "jti": str(uuid.uuid4()),
            "iat": issued_at,
            "exp": expires_at,
        }
        token: str = jwt.encode(claims, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
        return token

    @staticmethod
    def token_expires_at() -> datetime:
        """Return the expiry a token issued right now would carry."""
        return datetime.now(timezone.utc) + timedelta(days=settings.ACCESS_TOKEN_EXPIRE_DAYS)

    def verify_token(self, token: str) -> uuid.UUID:
        """Decode a JWT and return the user it identifies.

        Args:
            token: Bearer token from the Authorization header.

        Returns:
            The authenticated user's ID.

        Raises:
            PermissionError: If the token is expired, malformed or unsigned.
        """
        return verify_user_token(token)

    def logout(self, token: str) -> bool:
        """Invalidate a token.

        Returns:
            True once the token can no longer authenticate a request.
        """
        try:
            claims = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        except JWTError:
            # Already unusable, so the caller's goal is satisfied either way.
            return True

        token_id = claims.get("jti")
        if token_id:
            _revoked_token_ids.add(token_id)
        logger.info("Token revoked")
        return True

    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a plain-text password with bcrypt."""
        digest = bcrypt.hashpw(
            password.encode("utf-8")[:BCRYPT_MAX_BYTES],
            bcrypt.gensalt(rounds=BCRYPT_ROUNDS),
        )
        return digest.decode("utf-8")

    @staticmethod
    def verify_password(password: str, password_hash: str) -> bool:
        """Check a plain-text password against a bcrypt hash."""
        try:
            return bcrypt.checkpw(
                password.encode("utf-8")[:BCRYPT_MAX_BYTES],
                password_hash.encode("utf-8"),
            )
        except ValueError:
            # A malformed stored hash must read as "wrong password", never as
            # a crash that reveals the account exists.
            return False
