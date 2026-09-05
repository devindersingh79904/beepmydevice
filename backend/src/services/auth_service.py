"""Authentication: registration, login, token issue and verification."""

import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import ExpiredSignatureError, JWTError, jwt
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.config import settings
from src.models.user import User
from src.utils.constants import (
    BCRYPT_ROUNDS,
    PASSWORD_RESET_EXPIRE_MINUTES,
    PASSWORD_RESET_TOKEN_BYTES,
)
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

    # -- password management ------------------------------------------------

    def change_password(
        self,
        user_id: uuid.UUID,
        current_password: str,
        new_password: str,
    ) -> bool:
        """Replace a user's password after checking the current one.

        Args:
            user_id: The signed-in user.
            current_password: Checked against the stored hash. Requiring it is
                what stops a stolen but unexpired token being used to lock the
                real owner out of their account.
            new_password: Replacement, already length-checked by the schema.

        Returns:
            True once the new password is stored.

        Raises:
            LookupError: If the user no longer exists.
            PermissionError: If ``current_password`` does not match.
        """
        user = self._db.get(User, user_id)
        if user is None:
            raise LookupError("No such user")

        if not self.verify_password(current_password, user.password_hash):
            logger.warning(f"Rejected password change for {user_id}: wrong current password")
            raise PermissionError("Current password is incorrect")

        user.password_hash = self.hash_password(new_password)
        self._db.flush()
        logger.info(f"Password changed for {user_id}")
        return True

    def begin_password_reset(self, email: str) -> tuple[str, str] | None:
        """Issue a single-use reset token for an account.

        Returns:
            The recipient address and the raw token, or None when no account
            has that address. Callers must respond identically either way --
            revealing which addresses are registered is exactly what the login
            endpoint already refuses to do.
        """
        normalized_email = email.strip().lower()
        user = self._db.execute(
            select(User).where(User.email == normalized_email)
        ).scalar_one_or_none()
        if user is None:
            logger.info(f"Password reset requested for unknown address {normalized_email}")
            return None

        raw_token = secrets.token_urlsafe(PASSWORD_RESET_TOKEN_BYTES)
        user.password_reset_token_hash = self._hash_reset_token(raw_token)
        user.password_reset_expires_at = datetime.now(timezone.utc) + timedelta(
            minutes=PASSWORD_RESET_EXPIRE_MINUTES
        )
        self._db.flush()
        logger.info(f"Password reset issued for {user.user_id}")
        return user.email, raw_token

    def reset_password(self, raw_token: str, new_password: str) -> bool:
        """Consume a reset token and set a new password.

        Returns:
            True once the password is replaced.

        Raises:
            PermissionError: If the token is unknown, already used or expired.
        """
        token_hash = self._hash_reset_token(raw_token)
        user = self._db.execute(
            select(User).where(User.password_reset_token_hash == token_hash)
        ).scalar_one_or_none()

        if user is None or user.password_reset_expires_at is None:
            raise PermissionError("This reset link is not valid")

        expires_at = user.password_reset_expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            raise PermissionError("This reset link has expired")

        user.password_hash = self.hash_password(new_password)
        # Cleared immediately: a reset link works exactly once.
        user.password_reset_token_hash = None
        user.password_reset_expires_at = None
        self._db.flush()
        logger.info(f"Password reset completed for {user.user_id}")
        return True

    @staticmethod
    def _hash_reset_token(raw_token: str) -> str:
        """Hash a reset token for storage.

        SHA-256 rather than bcrypt: the token is 32 random bytes, so there is
        no weak input to slow an attacker down over, and the reset endpoint has
        to look the row up *by* the hash.
        """
        return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()

    # -- notification preferences -------------------------------------------

    def get_preferences(self, user_id: uuid.UUID) -> User:
        """Return the user row carrying the notification preferences.

        Raises:
            LookupError: If the user no longer exists.
        """
        user = self._db.get(User, user_id)
        if user is None:
            raise LookupError("No such user")
        return user

    def update_preferences(
        self,
        user_id: uuid.UUID,
        notifications_enabled: bool | None = None,
        sound_enabled: bool | None = None,
        vibration_enabled: bool | None = None,
        alert_on_silent: bool | None = None,
    ) -> User:
        """Apply the preferences a client sent.

        Only the fields actually supplied are written, so a client can send one
        toggle without having to echo back the other two and risk clobbering a
        change made on another device.

        Raises:
            LookupError: If the user no longer exists.
        """
        user = self.get_preferences(user_id)
        if notifications_enabled is not None:
            user.notifications_enabled = notifications_enabled
        if sound_enabled is not None:
            user.sound_enabled = sound_enabled
        if vibration_enabled is not None:
            user.vibration_enabled = vibration_enabled
        if alert_on_silent is not None:
            user.alert_on_silent = alert_on_silent
        self._db.flush()
        logger.info(f"Preferences updated for {user_id}")
        return user

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
