"""Tests for /auth/* endpoints and AuthService."""

import uuid
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from jose import jwt
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.config import settings
from src.models.user import User
from src.utils.constants import ErrorCode

PASSWORD = "CorrectHorse9"


def _codes(response: object) -> list[str]:
    """Return the error codes in a response body."""
    return [error["code"] for error in response.json()["errors"]]  # type: ignore[attr-defined]


class TestRegister:
    """POST /auth/register."""

    def test_registers_new_user_and_returns_token(self, client: TestClient) -> None:
        response = client.post(
            "/auth/register", json={"email": "new@example.com", "password": PASSWORD}
        )

        assert response.status_code == 201
        content = response.json()["data"]["content"]
        assert content["token"]
        assert content["token_type"] == "Bearer"
        assert uuid.UUID(content["user_id"])

    def test_rejects_duplicate_email(self, client: TestClient) -> None:
        body = {"email": "dupe@example.com", "password": PASSWORD}
        client.post("/auth/register", json=body)

        response = client.post("/auth/register", json=body)

        assert response.status_code == 409
        assert response.json()["success"] is False

    def test_rejects_invalid_email_with_val_003(self, client: TestClient) -> None:
        response = client.post(
            "/auth/register", json={"email": "not-an-email", "password": PASSWORD}
        )

        assert response.status_code == 422
        assert ErrorCode.INVALID_EMAIL_FORMAT.value in _codes(response)

    def test_rejects_short_password_with_val_004(self, client: TestClient) -> None:
        response = client.post(
            "/auth/register", json={"email": "short@example.com", "password": "abc"}
        )

        assert response.status_code == 422
        assert ErrorCode.PASSWORD_TOO_WEAK.value in _codes(response)

    def test_returns_all_validation_errors_at_once(self, client: TestClient) -> None:
        """A bad email and a weak password produce two entries in errors[]."""
        response = client.post("/auth/register", json={"email": "nope", "password": "abc"})

        codes = _codes(response)
        assert ErrorCode.INVALID_EMAIL_FORMAT.value in codes
        assert ErrorCode.PASSWORD_TOO_WEAK.value in codes

    def test_never_stores_plain_text_password(self, client: TestClient, db: Session) -> None:
        client.post("/auth/register", json={"email": "hash@example.com", "password": PASSWORD})

        user = db.execute(select(User).where(User.email == "hash@example.com")).scalar_one()
        assert PASSWORD not in user.password_hash
        assert user.password_hash.startswith("$2b$")


class TestLogin:
    """POST /auth/login."""

    def test_returns_token_for_valid_credentials(self, client: TestClient) -> None:
        client.post("/auth/register", json={"email": "login@example.com", "password": PASSWORD})

        response = client.post(
            "/auth/login", json={"email": "login@example.com", "password": PASSWORD}
        )

        assert response.status_code == 200
        assert response.json()["data"]["content"]["token"]

    def test_rejects_wrong_password_with_auth_001(self, client: TestClient) -> None:
        client.post("/auth/register", json={"email": "wrong@example.com", "password": PASSWORD})

        response = client.post(
            "/auth/login", json={"email": "wrong@example.com", "password": "NotIt12345"}
        )

        assert response.status_code == 401
        assert _codes(response) == [ErrorCode.INVALID_CREDENTIALS.value]

    def test_does_not_reveal_whether_email_exists(self, client: TestClient) -> None:
        """Unknown email and wrong password must return the same error."""
        client.post("/auth/register", json={"email": "known@example.com", "password": PASSWORD})

        wrong_password = client.post(
            "/auth/login", json={"email": "known@example.com", "password": "NotIt12345"}
        )
        unknown_email = client.post(
            "/auth/login", json={"email": "ghost@example.com", "password": "NotIt12345"}
        )

        assert wrong_password.status_code == unknown_email.status_code
        assert _codes(wrong_password) == _codes(unknown_email)
        assert wrong_password.json()["errors"] == unknown_email.json()["errors"]


class TestTokenVerification:
    """Token handling on protected endpoints."""

    def test_rejects_expired_token_with_auth_002(self, client: TestClient) -> None:
        expired = jwt.encode(
            {
                "sub": str(uuid.uuid4()),
                "type": "user",
                "jti": str(uuid.uuid4()),
                "exp": datetime.now(timezone.utc) - timedelta(minutes=1),
            },
            settings.SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM,
        )

        response = client.get("/devices/list", headers={"Authorization": f"Bearer {expired}"})

        assert response.status_code == 401
        assert _codes(response) == [ErrorCode.TOKEN_EXPIRED.value]

    def test_rejects_malformed_token_with_auth_003(self, client: TestClient) -> None:
        response = client.get("/devices/list", headers={"Authorization": "Bearer not-a-jwt"})

        assert response.status_code == 401
        assert _codes(response) == [ErrorCode.TOKEN_INVALID.value]

    def test_echoes_correlation_id_from_request_header(self, client: TestClient) -> None:
        correlation_id = str(uuid.uuid4())

        response = client.post(
            "/auth/login",
            json={"email": "nobody@example.com", "password": PASSWORD},
            headers={"X-Correlation-ID": correlation_id},
        )

        assert response.headers["X-Correlation-ID"] == correlation_id
        assert response.json()["correlation_id"] == correlation_id


class TestLogout:
    """POST /auth/logout."""

    def test_revoked_token_can_no_longer_authenticate(self, client: TestClient) -> None:
        registered = client.post(
            "/auth/register", json={"email": "bye@example.com", "password": PASSWORD}
        )
        token = registered.json()["data"]["content"]["token"]
        headers = {"Authorization": f"Bearer {token}"}

        assert client.post("/auth/logout", headers=headers).status_code == 200

        after = client.get("/devices/list", headers=headers)
        assert after.status_code == 401
        assert _codes(after) == [ErrorCode.TOKEN_INVALID.value]
