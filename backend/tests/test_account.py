"""Tests for account management: password change, reset and preferences."""

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.models.device import Device
from src.models.user import User
from src.utils.constants import ErrorCode
from tests.conftest import PushRecorder, register_device, register_user

PASSWORD = "CorrectHorse9"
NEW_PASSWORD = "FreshHorse42"


def _codes(response: object) -> list[str]:
    """Return the error codes in a response body."""
    return [error["code"] for error in response.json()["errors"]]  # type: ignore[attr-defined]


def _content(response: object) -> dict:
    """Return data.content from a response body."""
    return response.json()["data"]["content"]  # type: ignore[attr-defined]


@pytest.fixture
def account(client: TestClient) -> tuple[str, dict[str, str]]:
    """Register one account and return its email and auth headers."""
    email = f"user-{uuid.uuid4().hex[:12]}@example.com"
    headers = register_user(client, email)
    return email, headers


class TestChangePassword:
    """PUT /auth/change-password."""

    def test_changes_the_password(
        self, client: TestClient, account: tuple[str, dict[str, str]]
    ) -> None:
        email, headers = account

        response = client.put(
            "/auth/change-password",
            json={"current_password": PASSWORD, "new_password": NEW_PASSWORD},
            headers=headers,
        )

        assert response.status_code == 200
        assert (
            client.post("/auth/login", json={"email": email, "password": NEW_PASSWORD}).status_code
            == 200
        )

    def test_old_password_stops_working(
        self, client: TestClient, account: tuple[str, dict[str, str]]
    ) -> None:
        email, headers = account
        client.put(
            "/auth/change-password",
            json={"current_password": PASSWORD, "new_password": NEW_PASSWORD},
            headers=headers,
        )

        response = client.post("/auth/login", json={"email": email, "password": PASSWORD})

        assert response.status_code == 401

    def test_rejects_a_wrong_current_password(
        self, client: TestClient, account: tuple[str, dict[str, str]]
    ) -> None:
        _, headers = account

        response = client.put(
            "/auth/change-password",
            json={"current_password": "NotMyPassword1", "new_password": NEW_PASSWORD},
            headers=headers,
        )

        # Requiring the current password is what stops a stolen token being
        # enough to lock the real owner out.
        assert response.status_code == 401
        assert _codes(response) == [ErrorCode.INVALID_CREDENTIALS.value]

    def test_rejects_a_weak_new_password(
        self, client: TestClient, account: tuple[str, dict[str, str]]
    ) -> None:
        _, headers = account

        response = client.put(
            "/auth/change-password",
            json={"current_password": PASSWORD, "new_password": "short"},
            headers=headers,
        )

        assert response.status_code == 422
        assert ErrorCode.PASSWORD_TOO_WEAK.value in _codes(response)

    def test_requires_authentication(self, client: TestClient) -> None:
        response = client.put(
            "/auth/change-password",
            json={"current_password": PASSWORD, "new_password": NEW_PASSWORD},
        )

        assert response.status_code == 401


class TestPasswordReset:
    """POST /auth/forgot-password and /auth/reset-password."""

    def test_issues_a_token_for_a_known_address(
        self, client: TestClient, account: tuple[str, dict[str, str]], db: Session
    ) -> None:
        email, _ = account

        response = client.post("/auth/forgot-password", json={"email": email})

        assert response.status_code == 200
        user = db.execute(select(User).where(User.email == email)).scalar_one()
        assert user.password_reset_token_hash is not None
        # Stored hashed, so a leaked database hands out no working links.
        assert len(user.password_reset_token_hash) == 64

    def test_unknown_address_gets_the_identical_response(
        self, client: TestClient, account: tuple[str, dict[str, str]]
    ) -> None:
        email, _ = account

        known = client.post("/auth/forgot-password", json={"email": email})
        unknown = client.post("/auth/forgot-password", json={"email": "nobody@example.com"})

        # Otherwise this endpoint becomes the account enumerator that /auth/login
        # deliberately is not.
        assert known.status_code == unknown.status_code
        assert known.json()["message"] == unknown.json()["message"]

    def test_resets_the_password_with_a_valid_token(
        self, client: TestClient, account: tuple[str, dict[str, str]], db: Session
    ) -> None:
        email, _ = account
        raw_token = self._issue_token(client, db, email)

        response = client.post(
            "/auth/reset-password",
            json={"token": raw_token, "new_password": NEW_PASSWORD},
        )

        assert response.status_code == 200
        assert (
            client.post("/auth/login", json={"email": email, "password": NEW_PASSWORD}).status_code
            == 200
        )

    def test_a_reset_link_works_only_once(
        self, client: TestClient, account: tuple[str, dict[str, str]], db: Session
    ) -> None:
        email, _ = account
        raw_token = self._issue_token(client, db, email)
        client.post(
            "/auth/reset-password",
            json={"token": raw_token, "new_password": NEW_PASSWORD},
        )

        second = client.post(
            "/auth/reset-password",
            json={"token": raw_token, "new_password": "AnotherOne99"},
        )

        assert second.status_code == 400
        assert _codes(second) == [ErrorCode.TOKEN_INVALID.value]

    def test_rejects_an_expired_token(
        self, client: TestClient, account: tuple[str, dict[str, str]], db: Session
    ) -> None:
        email, _ = account
        raw_token = self._issue_token(client, db, email)
        user = db.execute(select(User).where(User.email == email)).scalar_one()
        user.password_reset_expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
        db.flush()

        response = client.post(
            "/auth/reset-password",
            json={"token": raw_token, "new_password": NEW_PASSWORD},
        )

        assert response.status_code == 400

    def test_rejects_an_unknown_token(self, client: TestClient) -> None:
        response = client.post(
            "/auth/reset-password",
            json={"token": "not-a-real-token", "new_password": NEW_PASSWORD},
        )

        assert response.status_code == 400

    @staticmethod
    def _issue_token(client: TestClient, db: Session, email: str) -> str:
        """Request a reset and return the raw token.

        The service stores only a hash, so the raw value is recovered the way
        the user would get it -- by asking for one and reading the link. Here
        that means re-deriving it, since the email body is not addressable from
        a test; the token is regenerated and written directly.
        """
        from src.services.auth_service import AuthService

        issued = AuthService(db).begin_password_reset(email)
        assert issued is not None
        db.flush()
        return issued[1]


class TestNotificationPreferences:
    """GET and PUT /auth/preferences."""

    def test_defaults_to_everything_on(
        self, client: TestClient, account: tuple[str, dict[str, str]]
    ) -> None:
        _, headers = account

        response = client.get("/auth/preferences", headers=headers)

        assert _content(response) == {
            "notifications_enabled": True,
            "sound_enabled": True,
            "vibration_enabled": True,
        }

    def test_updates_only_the_fields_supplied(
        self, client: TestClient, account: tuple[str, dict[str, str]]
    ) -> None:
        _, headers = account

        response = client.put(
            "/auth/preferences", json={"vibration_enabled": False}, headers=headers
        )

        content = _content(response)
        assert content["vibration_enabled"] is False
        # The omitted toggles keep their stored value rather than being reset.
        assert content["notifications_enabled"] is True
        assert content["sound_enabled"] is True

    def test_preferences_survive_a_new_request(
        self, client: TestClient, account: tuple[str, dict[str, str]]
    ) -> None:
        _, headers = account
        client.put("/auth/preferences", json={"sound_enabled": False}, headers=headers)

        response = client.get("/auth/preferences", headers=headers)

        assert _content(response)["sound_enabled"] is False

    def test_disabling_notifications_suppresses_the_push(
        self, client: TestClient, mock_push: PushRecorder, db: Session
    ) -> None:
        headers = register_user(client)
        device = register_device(client, headers, push_token="owner-token")
        client.put(
            "/auth/preferences",
            json={"notifications_enabled": False},
            headers=headers,
        )

        response = client.post(
            "/alerts/send",
            json={"device_ids": [device["device_id"]]},
            headers=headers,
        )

        # The toggle has to mean something: no push is attempted at all.
        assert response.status_code == 200
        assert mock_push.all_tokens == []

    def test_a_guest_is_unaffected_by_anyones_preferences(
        self, client: TestClient, mock_push: PushRecorder
    ) -> None:
        headers = register_user(client)
        register_device(client, headers, push_token="owner-token")
        guest = register_device(
            client, headers=None, device_name="Visitor", push_token="guest-token"
        )
        client.put(
            "/auth/preferences",
            json={"notifications_enabled": False},
            headers=headers,
        )

        client.post(
            "/alerts/send",
            json={"device_ids": [guest["device_id"]]},
            headers=headers,
        )

        # A guest has no owner, so there is no preference to consult.
        assert "guest-token" in mock_push.all_tokens

    def test_requires_authentication(self, client: TestClient) -> None:
        assert client.get("/auth/preferences").status_code == 401


class TestDeviceAlertHistory:
    """GET /alerts/logs/device/{device_id}."""

    def test_returns_alerts_that_targeted_the_device(
        self, client: TestClient, mock_push: PushRecorder
    ) -> None:
        headers = register_user(client)
        device = register_device(client, headers)
        client.post(
            "/alerts/send",
            json={"device_ids": [device["device_id"]]},
            headers=headers,
        )

        response = client.get(f"/alerts/logs/device/{device['device_id']}", headers=headers)

        assert response.status_code == 200
        assert len(_content(response)) == 1

    def test_excludes_alerts_that_targeted_another_device(
        self, client: TestClient, mock_push: PushRecorder
    ) -> None:
        headers = register_user(client)
        first = register_device(client, headers, device_name="One", push_token="t1")
        second = register_device(client, headers, device_name="Two", push_token="t2")
        client.post("/alerts/send", json={"device_ids": [first["device_id"]]}, headers=headers)

        response = client.get(f"/alerts/logs/device/{second['device_id']}", headers=headers)

        assert _content(response) == []

    def test_admin_can_read_a_guest_devices_history(
        self, client: TestClient, mock_push: PushRecorder
    ) -> None:
        headers = register_user(client)
        register_device(client, headers, push_token="owner-token")
        guest = register_device(
            client, headers=None, device_name="Visitor", push_token="guest-token"
        )
        client.post(
            "/alerts/send",
            json={"device_ids": [guest["device_id"]]},
            headers=headers,
        )

        response = client.get(f"/alerts/logs/device/{guest['device_id']}", headers=headers)

        # Scoped by network administration, not ownership -- a guest has no owner.
        assert response.status_code == 200
        assert len(_content(response)) == 1

    def test_rejects_a_device_on_another_network(self, client: TestClient, db: Session) -> None:
        headers = register_user(client)
        device = register_device(client, headers)
        stranger = register_user(client)
        register_device(client, stranger, device_name="Theirs", wifi_mac="AA:BB:CC:DD:EE:FF")

        response = client.get(f"/alerts/logs/device/{device['device_id']}", headers=stranger)

        assert response.status_code == 403

    def test_reports_an_unknown_device(
        self, client: TestClient, auth_headers: dict[str, str]
    ) -> None:
        response = client.get(f"/alerts/logs/device/{uuid.uuid4()}", headers=auth_headers)

        assert response.status_code == 404
        assert _codes(response) == [ErrorCode.DEVICE_NOT_FOUND.value]


def test_device_relationship_exposes_the_owner(db: Session, client: TestClient) -> None:
    """NotificationService reads device.user to find the owner's preferences."""
    headers = register_user(client)
    registered = register_device(client, headers)

    device = db.get(Device, uuid.UUID(registered["device_id"]))

    assert device is not None
    assert device.user is not None
    assert device.user.notifications_enabled is True


class TestProviderConfiguration:
    """`.env.example` placeholders must not read as configured.

    A plain truthiness check calls "your-project-id" configured, so the setup
    verification reports success and every push then fails at the provider with
    an opaque error instead of the clear "not configured" warning.
    """

    def test_placeholders_do_not_count_as_configured(self) -> None:
        from src.config import Settings

        assert Settings._configured("your-project-id") is False
        assert Settings._configured("XXXXXXXXXX") is False
        assert Settings._configured("<your-key>") is False
        assert Settings._configured("") is False
        assert Settings._configured("./secrets/AuthKey_XXXXXXXXXX.p8") is False
        assert Settings._configured("firebase-adminsdk-xxxxx@p.iam.gserviceaccount.com") is False

    def test_a_placeholder_wrapped_in_a_real_envelope_is_caught(self) -> None:
        """The private-key placeholder looks like a genuine PEM.

        Only the middle is fake, so a prefix check passes it and the app then
        reports Firebase as configured while every send fails at the provider.
        """
        from src.config import Settings

        pem = "-----BEGIN PRIVATE KEY----- YOUR_KEY_HERE -----END PRIVATE KEY-----"

        assert Settings._configured(pem) is False

    def test_real_values_count_as_configured(self) -> None:
        from src.config import Settings

        assert Settings._configured("a-real-project-id") is True
        assert Settings._configured("a", "b", "c") is True

    def test_one_placeholder_disqualifies_the_set(self) -> None:
        from src.config import Settings

        # Half-configured is not configured: a real project ID with a
        # placeholder key still cannot sign a request.
        assert Settings._configured("a-real-project-id", "your-key") is False
