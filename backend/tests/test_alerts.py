"""Tests for /alerts/* endpoints and AlertService.

The authorization cases here are the most important tests in the suite: they
are what stop one household from beeping another household's devices.
"""

import uuid
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.models.alert_log import AlertLog
from src.models.device import Device
from src.services.notification_service import NotificationService
from src.utils.constants import (
    OFFLINE_THRESHOLD_SECONDS,
    PUSH_MAX_RETRIES,
    AlertStatus,
    DeviceStatus,
    ErrorCode,
)
from tests.conftest import (
    OTHER_MAC,
    VALID_MAC,
    PushRecorder,
    register_device,
    register_user,
)


def _codes(response: object) -> list[str]:
    """Return the error codes in a response body."""
    return [error["code"] for error in response.json()["errors"]]  # type: ignore[attr-defined]


def _content(response: object) -> dict:
    """Return data.content from a response body."""
    return response.json()["data"]["content"]  # type: ignore[attr-defined]


def _set_status(db: Session, device_id: str, status: DeviceStatus) -> None:
    """Force a device's status, standing in for a missed or foreign heartbeat."""
    device = db.get(Device, uuid.UUID(device_id))
    device.status = status.value
    db.flush()


class TestAlertAuthorization:
    """The three checks that gate every send."""

    def test_rejects_target_on_another_network_with_alert_001(
        self, client: TestClient, auth_headers: dict[str, str], mock_push: PushRecorder
    ) -> None:
        mine = register_device(client, auth_headers, device_name="Mine")
        stranger = register_user(client)
        theirs = register_device(client, stranger, device_name="Theirs", wifi_mac=OTHER_MAC)

        response = client.post(
            "/alerts/send",
            json={"device_ids": [mine["device_id"], theirs["device_id"]]},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert _codes(response) == [ErrorCode.DIFFERENT_WIFI_NETWORKS.value]
        assert mock_push.all_tokens == []

    def test_allows_guest_target_that_sender_does_not_own(
        self, client: TestClient, auth_headers: dict[str, str], mock_push: PushRecorder
    ) -> None:
        """Ownership is not required of targets -- guests have no owner at all."""
        register_device(client, auth_headers, device_name="Mine")
        guest = register_device(
            client, headers=None, device_name="Visitor", push_token="guest-token"
        )

        response = client.post(
            "/alerts/send",
            json={"device_ids": [guest["device_id"]]},
            headers=auth_headers,
        )

        assert response.status_code == 200
        assert "guest-token" in mock_push.all_tokens

    def test_guest_device_token_cannot_send_at_all(
        self, client: TestClient, auth_headers: dict[str, str], mock_push: PushRecorder
    ) -> None:
        """A guest holds no user token, so it fails authentication, not a role check."""
        register_device(client, auth_headers)
        guest = register_device(client, headers=None, device_name="Visitor")

        response = client.post(
            "/alerts/send",
            json={"device_ids": []},
            headers={"Authorization": f"Bearer {guest['device_token']}"},
        )

        assert response.status_code == 403
        assert mock_push.all_tokens == []

    def test_rejects_guest_sender_with_alert_005(
        self, client: TestClient, auth_headers: dict[str, str]
    ) -> None:
        register_device(client, auth_headers)
        guest = register_device(client, headers=None, device_name="Visitor")

        response = client.post(
            "/alerts/send",
            json={"device_ids": []},
            headers={"Authorization": f"Bearer {guest['device_token']}"},
        )

        assert _codes(response) == [ErrorCode.GUEST_CANNOT_SEND.value]

    def test_rejects_targets_on_different_wifi_with_alert_001(
        self, client: TestClient, auth_headers: dict[str, str]
    ) -> None:
        mine = register_device(client, auth_headers, device_name="Mine")
        stranger = register_user(client)
        theirs = register_device(client, stranger, device_name="Theirs", wifi_mac=OTHER_MAC)

        response = client.post(
            "/alerts/send",
            json={"device_ids": [theirs["device_id"], mine["device_id"]]},
            headers=auth_headers,
        )

        assert _codes(response) == [ErrorCode.DIFFERENT_WIFI_NETWORKS.value]

    def test_rejects_non_admin_sender_with_alert_003(
        self, client: TestClient, auth_headers: dict[str, str], mock_push: PushRecorder
    ) -> None:
        mine = register_device(client, auth_headers, device_name="Mine")
        stranger = register_user(client)
        register_device(client, stranger, device_name="Theirs", wifi_mac=OTHER_MAC)

        # The stranger is a real user, and every target shares one network --
        # just not one they administer.
        response = client.post(
            "/alerts/send",
            json={"device_ids": [mine["device_id"]]},
            headers=stranger,
        )

        assert response.status_code == 403
        assert _codes(response) == [ErrorCode.PERMISSION_DENIED.value]
        assert mock_push.all_tokens == []

    def test_aborts_entire_send_when_one_target_fails_authorization(
        self, client: TestClient, auth_headers: dict[str, str], mock_push: PushRecorder
    ) -> None:
        """No partial delivery: one bad target rejects the whole request."""
        good = register_device(client, auth_headers, push_token="reachable-token")
        stranger = register_user(client)
        bad = register_device(client, stranger, device_name="Theirs", wifi_mac=OTHER_MAC)

        response = client.post(
            "/alerts/send",
            json={"device_ids": [good["device_id"], bad["device_id"]]},
            headers=auth_headers,
        )

        assert response.status_code == 400
        # The reachable target must not have been beeped despite being valid.
        assert mock_push.all_tokens == []

    def test_rejects_device_marked_unknown_after_network_change(
        self,
        client: TestClient,
        auth_headers: dict[str, str],
        db: Session,
        mock_push: PushRecorder,
    ) -> None:
        device = register_device(client, auth_headers)
        # A heartbeat from a different MAC is what sets UNKNOWN in real use.
        client.put(
            f"/devices/{device['device_id']}/heartbeat",
            json={"battery_level": 50, "wifi_mac": OTHER_MAC},
            headers=auth_headers,
        )

        response = client.post(
            "/alerts/send",
            json={"device_ids": [device["device_id"]]},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert _codes(response) == [ErrorCode.NO_TARGET_DEVICES.value]
        assert mock_push.all_tokens == []


class TestSendAlert:
    """POST /alerts/send."""

    def test_sends_to_all_devices_on_network_when_ids_empty(
        self, client: TestClient, auth_headers: dict[str, str], mock_push: PushRecorder
    ) -> None:
        register_device(client, auth_headers, device_name="One", push_token="token-one")
        register_device(client, auth_headers, device_name="Two", push_token="token-two")

        response = client.post("/alerts/send", json={"device_ids": []}, headers=auth_headers)

        assert response.status_code == 200
        assert set(mock_push.all_tokens) == {"token-one", "token-two"}

    def test_empty_ids_includes_guest_devices(
        self, client: TestClient, auth_headers: dict[str, str], mock_push: PushRecorder
    ) -> None:
        register_device(client, auth_headers, push_token="owner-token")
        register_device(client, headers=None, device_name="Visitor", push_token="guest-token")

        client.post("/alerts/send", json={"device_ids": []}, headers=auth_headers)

        assert "guest-token" in mock_push.all_tokens

    def test_routes_ios_devices_to_apns_and_android_to_firebase(
        self, client: TestClient, auth_headers: dict[str, str], mock_push: PushRecorder
    ) -> None:
        register_device(
            client,
            auth_headers,
            device_name="iPhone",
            device_type="ios",
            push_token="ios-token",
        )
        register_device(
            client,
            auth_headers,
            device_name="Pixel",
            device_type="android",
            push_token="android-token",
        )

        client.post("/alerts/send", json={"device_ids": []}, headers=auth_headers)

        assert mock_push.apns == ["ios-token"]
        assert mock_push.firebase == ["android-token"]

    def test_returns_per_device_delivery_status(
        self, client: TestClient, auth_headers: dict[str, str], mock_push: PushRecorder
    ) -> None:
        first = register_device(client, auth_headers, device_name="One")
        second = register_device(client, auth_headers, device_name="Two")

        response = client.post(
            "/alerts/send",
            json={"device_ids": [first["device_id"], second["device_id"]]},
            headers=auth_headers,
        )

        delivery = _content(response)["delivery_status"]
        assert {entry["device_id"] for entry in delivery} == {
            first["device_id"],
            second["device_id"],
        }
        assert all(entry["status"] == AlertStatus.SENT.value for entry in delivery)

    def test_reports_alert_004_for_failed_push_without_failing_others(
        self, client: TestClient, auth_headers: dict[str, str], mock_push: PushRecorder
    ) -> None:
        good = register_device(client, auth_headers, push_token="good-token")
        bad = register_device(client, auth_headers, push_token="bad-token")
        mock_push.fail("bad-token")

        response = client.post(
            "/alerts/send",
            json={"device_ids": [good["device_id"], bad["device_id"]]},
            headers=auth_headers,
        )

        assert response.status_code == 200
        outcomes = {
            entry["device_id"]: (entry["status"], entry["error_code"])
            for entry in _content(response)["delivery_status"]
        }
        assert outcomes[good["device_id"]] == (AlertStatus.SENT.value, None)
        assert outcomes[bad["device_id"]] == (
            AlertStatus.FAILED.value,
            ErrorCode.PUSH_NOTIFICATION_FAILED.value,
        )

    def test_returns_alert_002_when_no_targets_available(
        self, client: TestClient, auth_headers: dict[str, str], db: Session
    ) -> None:
        device = register_device(client, auth_headers)
        _set_status(db, device["device_id"], DeviceStatus.OFFLINE)

        response = client.post("/alerts/send", json={"device_ids": []}, headers=auth_headers)

        assert response.status_code == 400
        assert _codes(response) == [ErrorCode.NO_TARGET_DEVICES.value]

    def test_writes_audit_row_for_every_attempt(
        self,
        client: TestClient,
        auth_headers: dict[str, str],
        db: Session,
        mock_push: PushRecorder,
    ) -> None:
        device = register_device(client, auth_headers)

        response = client.post(
            "/alerts/send",
            json={"device_ids": [device["device_id"]]},
            headers=auth_headers,
        )

        alert = db.get(AlertLog, uuid.UUID(_content(response)["alert_id"]))
        assert alert is not None
        assert alert.target_devices == [device["device_id"]]
        assert alert.status == AlertStatus.SENT.value

    def test_clears_stale_push_token_on_unregistered_error(
        self, client: TestClient, auth_headers: dict[str, str], db: Session
    ) -> None:
        registered = register_device(client, auth_headers, push_token="stale-token")
        device_id = uuid.UUID(registered["device_id"])

        NotificationService(db).handle_notification_failure(device_id)

        device = db.get(Device, device_id)
        assert device.push_token is None
        assert device.status == DeviceStatus.OFFLINE.value


class TestAlertLogs:
    """GET /alerts/logs."""

    def test_returns_callers_alerts_newest_first(
        self, client: TestClient, auth_headers: dict[str, str], mock_push: PushRecorder
    ) -> None:
        device = register_device(client, auth_headers)
        for _ in range(2):
            client.post(
                "/alerts/send",
                json={"device_ids": [device["device_id"]]},
                headers=auth_headers,
            )

        response = client.get("/alerts/logs", headers=auth_headers)

        created = [entry["created_at"] for entry in _content(response)]
        assert len(created) == 2
        assert created == sorted(created, reverse=True)

    def test_does_not_leak_other_users_alerts(
        self, client: TestClient, auth_headers: dict[str, str], mock_push: PushRecorder
    ) -> None:
        device = register_device(client, auth_headers)
        client.post(
            "/alerts/send",
            json={"device_ids": [device["device_id"]]},
            headers=auth_headers,
        )

        stranger = register_user(client)
        register_device(client, stranger, device_name="Theirs", wifi_mac=OTHER_MAC)

        response = client.get("/alerts/logs", headers=stranger)

        assert _content(response) == []


class TestStaleDevicesAreNotTargets:
    """A device that stopped speaking cannot be alerted.

    The stored status column still says ONLINE -- nothing rewrites it when a
    phone is simply switched off -- so authorization has to bound it by the
    heartbeat window or it will happily push at something unreachable.
    """

    @staticmethod
    def _age(db: Session, device_id: str, seconds: int) -> None:
        """Backdate a device's last heartbeat."""
        device = db.get(Device, uuid.UUID(device_id))
        device.last_heartbeat = datetime.now(timezone.utc) - timedelta(seconds=seconds)
        db.flush()

    def test_naming_a_stale_device_is_rejected(
        self,
        client: TestClient,
        auth_headers: dict[str, str],
        db: Session,
        mock_push: PushRecorder,
    ) -> None:
        device = register_device(client, auth_headers)
        self._age(db, device["device_id"], OFFLINE_THRESHOLD_SECONDS + 1)

        response = client.post(
            "/alerts/send",
            json={"device_ids": [device["device_id"]]},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert _codes(response) == [ErrorCode.NO_TARGET_DEVICES.value]
        assert mock_push.all_tokens == []

    def test_a_whole_network_alert_skips_stale_devices(
        self,
        client: TestClient,
        auth_headers: dict[str, str],
        db: Session,
        mock_push: PushRecorder,
    ) -> None:
        fresh = register_device(client, auth_headers, device_name="Fresh", push_token="fresh")
        stale = register_device(client, auth_headers, device_name="Stale", push_token="stale")
        self._age(db, stale["device_id"], OFFLINE_THRESHOLD_SECONDS + 1)

        response = client.post("/alerts/send", json={"device_ids": []}, headers=auth_headers)

        assert response.status_code == 200
        assert mock_push.all_tokens == ["fresh"]
        assert fresh["device_id"] != stale["device_id"]

    def test_all_stale_means_no_targets(
        self,
        client: TestClient,
        auth_headers: dict[str, str],
        db: Session,
        mock_push: PushRecorder,
    ) -> None:
        device = register_device(client, auth_headers)
        self._age(db, device["device_id"], OFFLINE_THRESHOLD_SECONDS + 1)

        response = client.post("/alerts/send", json={"device_ids": []}, headers=auth_headers)

        assert response.status_code == 400
        assert _codes(response) == [ErrorCode.NO_TARGET_DEVICES.value]


class TestPushFailureHandling:
    """What happens to the token when a push does not land."""

    def test_a_disowned_token_is_cleared(
        self,
        client: TestClient,
        auth_headers: dict[str, str],
        db: Session,
        mock_push: PushRecorder,
    ) -> None:
        registered = register_device(client, auth_headers, push_token="dead-token")
        mock_push.reject("dead-token")

        client.post(
            "/alerts/send",
            json={"device_ids": [registered["device_id"]]},
            headers=auth_headers,
        )

        device = db.get(Device, uuid.UUID(registered["device_id"]))
        # Leaving it in place means this device silently fails forever while
        # still looking reachable.
        assert device.push_token is None
        assert device.status == DeviceStatus.OFFLINE.value

    def test_a_transient_failure_leaves_the_token_alone(
        self,
        client: TestClient,
        auth_headers: dict[str, str],
        db: Session,
        mock_push: PushRecorder,
    ) -> None:
        registered = register_device(client, auth_headers, push_token="flaky-token")
        mock_push.fail("flaky-token")

        client.post(
            "/alerts/send",
            json={"device_ids": [registered["device_id"]]},
            headers=auth_headers,
        )

        device = db.get(Device, uuid.UUID(registered["device_id"]))
        # The provider was merely unavailable; the token is still good.
        assert device.push_token == "flaky-token"

    def test_a_transient_failure_is_retried(
        self, client: TestClient, auth_headers: dict[str, str], mock_push: PushRecorder
    ) -> None:
        registered = register_device(client, auth_headers, push_token="flaky-token")
        mock_push.fail("flaky-token")

        client.post(
            "/alerts/send",
            json={"device_ids": [registered["device_id"]]},
            headers=auth_headers,
        )

        assert mock_push.firebase.count("flaky-token") == PUSH_MAX_RETRIES

    def test_a_disowned_token_is_not_retried(
        self, client: TestClient, auth_headers: dict[str, str], mock_push: PushRecorder
    ) -> None:
        registered = register_device(client, auth_headers, push_token="dead-token")
        mock_push.reject("dead-token")

        client.post(
            "/alerts/send",
            json={"device_ids": [registered["device_id"]]},
            headers=auth_headers,
        )

        # No number of attempts makes a dead token live.
        assert mock_push.firebase.count("dead-token") == 1
