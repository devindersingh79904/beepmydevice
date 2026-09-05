"""Tests for /devices/* endpoints and DeviceService."""

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.models.device import Device
from src.models.wifi_network import WiFiNetwork
from src.routes import websocket as websocket_routes
from src.utils.constants import (
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
    OFFLINE_THRESHOLD_SECONDS,
    DeviceStatus,
    ErrorCode,
)
from tests.conftest import (
    OTHER_MAC,
    VALID_MAC,
    device_payload,
    register_device,
    register_user,
)


def _codes(response: object) -> list[str]:
    """Return the error codes in a response body."""
    return [error["code"] for error in response.json()["errors"]]  # type: ignore[attr-defined]


def _content(response: object) -> object:
    """Return data.content from a response body."""
    return response.json()["data"]["content"]  # type: ignore[attr-defined]


class TestDeviceRegistration:
    """POST /devices/register."""

    def test_reinstall_updates_the_same_row(
        self, client: TestClient, auth_headers: dict[str, str]
    ) -> None:
        """A reinstall keeps one row, even though the push token changed.

        This is what put one phone in the dashboard once per install it had
        ever had: the push token is reissued on every reinstall, so without a
        stable identifier each one looked like a new device.
        """
        first = register_device(client, auth_headers, install_id="android-id-1")
        second = register_device(
            client,
            auth_headers,
            install_id="android-id-1",
            push_token="a-freshly-issued-token",
        )

        assert second["device_id"] == first["device_id"]

    def test_a_different_install_is_a_different_device(
        self, client: TestClient, auth_headers: dict[str, str]
    ) -> None:
        """Two phones on one network stay two rows."""
        first = register_device(client, auth_headers, install_id="android-id-1")
        second = register_device(client, auth_headers, install_id="android-id-2")

        assert second["device_id"] != first["device_id"]

    def test_devices_without_a_push_token_do_not_collide(
        self, client: TestClient, auth_headers: dict[str, str]
    ) -> None:
        """Declining notifications must not merge every such phone into one row.

        Matching on an empty push token did exactly that.
        """
        first = register_device(
            client, auth_headers, push_token="", install_id="android-id-1"
        )
        second = register_device(
            client, auth_headers, push_token="", install_id="android-id-2"
        )

        assert second["device_id"] != first["device_id"]

    def test_older_client_without_install_id_still_reregisters(
        self, client: TestClient, auth_headers: dict[str, str]
    ) -> None:
        """The push-token path stays for clients that predate install_id."""
        first = register_device(client, auth_headers, push_token="stable-token")
        second = register_device(client, auth_headers, push_token="stable-token")

        assert second["device_id"] == first["device_id"]

    def test_registers_device_and_returns_id(
        self, client: TestClient, auth_headers: dict[str, str]
    ) -> None:
        content = register_device(client, auth_headers)

        assert uuid.UUID(content["device_id"])
        assert content["is_guest"] is False

    def test_creates_wifi_network_row_on_first_device(
        self, client: TestClient, auth_headers: dict[str, str], db: Session
    ) -> None:
        register_device(client, auth_headers)

        network = db.execute(
            select(WiFiNetwork).where(WiFiNetwork.mac_address == VALID_MAC)
        ).scalar_one()
        assert network.network_name == "Home-WiFi"

    def test_reuses_existing_wifi_network_for_same_mac(
        self, client: TestClient, auth_headers: dict[str, str], db: Session
    ) -> None:
        """Two devices on one router must share a single wifi_id."""
        first = register_device(client, auth_headers, device_name="One")
        second = register_device(client, auth_headers, device_name="Two")

        wifi_ids = {
            db.get(Device, uuid.UUID(first["device_id"])).wifi_id,
            db.get(Device, uuid.UUID(second["device_id"])).wifi_id,
        }
        assert len(wifi_ids) == 1

    def test_rejects_unsupported_device_type_with_device_003(
        self, client: TestClient, auth_headers: dict[str, str]
    ) -> None:
        response = client.post(
            "/devices/register",
            json=device_payload(device_type="blackberry"),
            headers=auth_headers,
        )

        assert response.status_code == 422
        assert ErrorCode.INVALID_DEVICE_TYPE.value in _codes(response)

    def test_rejects_malformed_wifi_mac(
        self, client: TestClient, auth_headers: dict[str, str]
    ) -> None:
        response = client.post(
            "/devices/register",
            json=device_payload(wifi_mac="not-a-mac"),
            headers=auth_headers,
        )

        assert response.status_code == 422
        assert ErrorCode.INVALID_FIELD_FORMAT.value in _codes(response)

    def test_registers_guest_when_no_token_supplied(
        self, client: TestClient, auth_headers: dict[str, str]
    ) -> None:
        """No Authorization header means a guest, not a rejection."""
        register_device(client, auth_headers)

        content = register_device(client, headers=None, device_name="Visitor")

        assert content["is_guest"] is True

    def test_guest_registration_returns_device_token(
        self, client: TestClient, auth_headers: dict[str, str]
    ) -> None:
        register_device(client, auth_headers)

        content = register_device(client, headers=None, device_name="Visitor")

        assert content["device_token"]

    def test_owned_registration_returns_null_device_token(
        self, client: TestClient, auth_headers: dict[str, str]
    ) -> None:
        content = register_device(client, auth_headers)

        assert content["device_token"] is None

    def test_rejects_present_but_invalid_token_instead_of_creating_guest(
        self, client: TestClient, auth_headers: dict[str, str]
    ) -> None:
        """An expired session must not silently downgrade a device to a guest."""
        register_device(client, auth_headers)

        response = client.post(
            "/devices/register",
            json=device_payload(),
            headers={"Authorization": "Bearer garbage"},
        )

        assert response.status_code == 401
        assert _codes(response) == [ErrorCode.TOKEN_INVALID.value]

    def test_guest_cannot_register_against_unclaimed_network(self, client: TestClient) -> None:
        """A guest joins an existing network; it never creates an ownerless one."""
        response = client.post("/devices/register", json=device_payload())

        assert response.status_code == 404
        assert _codes(response) == [ErrorCode.DEVICE_NOT_FOUND.value]

    def test_guest_device_has_null_user_id(
        self, client: TestClient, auth_headers: dict[str, str], db: Session
    ) -> None:
        register_device(client, auth_headers)
        guest = register_device(client, headers=None, device_name="Visitor")

        device = db.get(Device, uuid.UUID(guest["device_id"]))
        assert device.user_id is None
        assert device.is_guest is True


class TestDeviceList:
    """GET /devices/list."""

    def test_returns_all_devices_on_network_including_guests(
        self, client: TestClient, auth_headers: dict[str, str]
    ) -> None:
        """Scoped by network, not owner -- guests are exactly what admins hunt for."""
        register_device(client, auth_headers, device_name="Mine")
        register_device(client, headers=None, device_name="Visitor")

        response = client.get("/devices/list", headers=auth_headers)

        names = {device["device_name"] for device in _content(response)}
        assert names == {"Mine", "Visitor"}

    def test_does_not_return_devices_from_another_network(
        self, client: TestClient, auth_headers: dict[str, str]
    ) -> None:
        register_device(client, auth_headers, device_name="Mine")
        stranger = register_user(client)
        register_device(client, stranger, device_name="Theirs", wifi_mac=OTHER_MAC)

        response = client.get("/devices/list", headers=auth_headers)

        names = {device["device_name"] for device in _content(response)}
        assert names == {"Mine"}

    def test_flags_guest_devices_with_is_guest(
        self, client: TestClient, auth_headers: dict[str, str]
    ) -> None:
        register_device(client, auth_headers, device_name="Mine")
        register_device(client, headers=None, device_name="Visitor")

        response = client.get("/devices/list", headers=auth_headers)

        flags = {device["device_name"]: device["is_guest"] for device in _content(response)}
        assert flags == {"Mine": False, "Visitor": True}

    def test_guest_device_token_cannot_list_devices(
        self, client: TestClient, auth_headers: dict[str, str]
    ) -> None:
        register_device(client, auth_headers)
        guest = register_device(client, headers=None, device_name="Visitor")

        response = client.get(
            "/devices/list",
            headers={"Authorization": f"Bearer {guest['device_token']}"},
        )

        assert response.status_code == 401
        assert _codes(response) == [ErrorCode.TOKEN_INVALID.value]

    def test_paginates_with_defaults(
        self, client: TestClient, auth_headers: dict[str, str]
    ) -> None:
        register_device(client, auth_headers)

        response = client.get("/devices/list", headers=auth_headers)

        pagination = response.json()["data"]["pagination"]
        assert pagination["current_page"] == 1
        assert pagination["page_size"] == DEFAULT_PAGE_SIZE

    def test_caps_limit_at_max_page_size(
        self, client: TestClient, auth_headers: dict[str, str]
    ) -> None:
        response = client.get(f"/devices/list?limit={MAX_PAGE_SIZE + 1}", headers=auth_headers)

        assert response.status_code == 422

    def test_response_nests_pagination_under_data(
        self, client: TestClient, auth_headers: dict[str, str]
    ) -> None:
        register_device(client, auth_headers)

        body = client.get("/devices/list", headers=auth_headers).json()

        assert "pagination" in body["data"]
        assert "pagination" not in body

    def test_never_exposes_push_token(
        self, client: TestClient, auth_headers: dict[str, str]
    ) -> None:
        register_device(client, auth_headers, push_token="super-secret-token")

        body = client.get("/devices/list", headers=auth_headers).text

        assert "super-secret-token" not in body


class TestHeartbeat:
    """PUT /devices/{device_id}/heartbeat."""

    def test_sets_status_online_and_updates_battery(
        self, client: TestClient, auth_headers: dict[str, str]
    ) -> None:
        device = register_device(client, auth_headers)

        response = client.put(
            f"/devices/{device['device_id']}/heartbeat",
            json={"battery_level": 42, "wifi_mac": VALID_MAC},
            headers=auth_headers,
        )

        content = _content(response)
        assert content["status"] == DeviceStatus.ONLINE.value
        assert content["battery_level"] == 42

    def test_sets_status_unknown_when_wifi_mac_changed(
        self, client: TestClient, auth_headers: dict[str, str]
    ) -> None:
        """A device that moved networks must not stay alertable."""
        device = register_device(client, auth_headers)

        response = client.put(
            f"/devices/{device['device_id']}/heartbeat",
            json={"battery_level": 50, "wifi_mac": OTHER_MAC},
            headers=auth_headers,
        )

        assert _content(response)["status"] == DeviceStatus.UNKNOWN.value

    def test_rejects_battery_level_above_100(
        self, client: TestClient, auth_headers: dict[str, str]
    ) -> None:
        device = register_device(client, auth_headers)

        response = client.put(
            f"/devices/{device['device_id']}/heartbeat",
            json={"battery_level": 101, "wifi_mac": VALID_MAC},
            headers=auth_headers,
        )

        assert response.status_code == 422
        assert ErrorCode.INVALID_FIELD_FORMAT.value in _codes(response)

    def test_broadcasts_status_change_over_websocket(
        self,
        client: TestClient,
        auth_headers: dict[str, str],
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        device = register_device(client, auth_headers)
        broadcasts: list[tuple[object, ...]] = []

        async def record(
            device_id: object,
            status: object,
            battery_level: object,
            audience: object = None,
        ) -> bool:
            broadcasts.append((device_id, status, battery_level, audience))
            return True

        monkeypatch.setattr(websocket_routes.manager, "broadcast_device_update", record)

        client.put(
            f"/devices/{device['device_id']}/heartbeat",
            json={"battery_level": 77, "wifi_mac": VALID_MAC},
            headers=auth_headers,
        )

        assert len(broadcasts) == 1
        assert broadcasts[0][1] == DeviceStatus.ONLINE.value
        assert broadcasts[0][2] == 77
        # Aimed at the network admin, never at every connected dashboard.
        assert broadcasts[0][3] is not None

    def test_accepts_guest_device_token(
        self, client: TestClient, auth_headers: dict[str, str]
    ) -> None:
        register_device(client, auth_headers)
        guest = register_device(client, headers=None, device_name="Visitor")

        response = client.put(
            f"/devices/{guest['device_id']}/heartbeat",
            json={"battery_level": 60, "wifi_mac": VALID_MAC},
            headers={"Authorization": f"Bearer {guest['device_token']}"},
        )

        assert response.status_code == 200

    def test_device_token_cannot_heartbeat_a_different_device(
        self, client: TestClient, auth_headers: dict[str, str]
    ) -> None:
        """A device token is scoped to one device_id and must not cross over."""
        owned = register_device(client, auth_headers, device_name="Mine")
        guest = register_device(client, headers=None, device_name="Visitor")

        response = client.put(
            f"/devices/{owned['device_id']}/heartbeat",
            json={"battery_level": 60, "wifi_mac": VALID_MAC},
            headers={"Authorization": f"Bearer {guest['device_token']}"},
        )

        assert response.status_code == 403
        assert _codes(response) == [ErrorCode.UNAUTHORIZED.value]


class TestDeviceRemoval:
    """DELETE /devices/{device_id}."""

    def test_removes_device(
        self, client: TestClient, auth_headers: dict[str, str], db: Session
    ) -> None:
        device = register_device(client, auth_headers)

        response = client.delete(f"/devices/{device['device_id']}", headers=auth_headers)

        assert response.status_code == 200
        assert db.get(Device, uuid.UUID(device["device_id"])) is None

    def test_cannot_remove_another_users_device(
        self, client: TestClient, auth_headers: dict[str, str]
    ) -> None:
        device = register_device(client, auth_headers)
        stranger = register_user(client)
        register_device(client, stranger, device_name="Theirs", wifi_mac=OTHER_MAC)

        response = client.delete(f"/devices/{device['device_id']}", headers=stranger)

        assert response.status_code == 403
        assert _codes(response) == [ErrorCode.UNAUTHORIZED.value]

    def test_admin_can_remove_guest_on_their_network(
        self, client: TestClient, auth_headers: dict[str, str], db: Session
    ) -> None:
        """Removal is the admin's control over open guest registration."""
        register_device(client, auth_headers)
        guest = register_device(client, headers=None, device_name="Visitor")

        response = client.delete(f"/devices/{guest['device_id']}", headers=auth_headers)

        assert response.status_code == 200
        assert db.get(Device, uuid.UUID(guest["device_id"])) is None


class TestStatusGoesStale:
    """A device that stops speaking must stop reading as ONLINE.

    Every other test in this file asserts on a device registered moments
    earlier, which is exactly why nothing caught the status column being
    reported verbatim: it is correct at the moment it is written and never
    revisited.
    """

    @staticmethod
    def _age(db: Session, device_id: str, seconds: int) -> None:
        """Backdate a device's last heartbeat."""
        device = db.get(Device, uuid.UUID(device_id))
        device.last_heartbeat = datetime.now(timezone.utc) - timedelta(seconds=seconds)
        db.flush()

    def test_reports_offline_once_the_heartbeat_window_passes(
        self, client: TestClient, auth_headers: dict[str, str], db: Session
    ) -> None:
        device = register_device(client, auth_headers)
        self._age(db, device["device_id"], OFFLINE_THRESHOLD_SECONDS + 1)

        response = client.get("/devices/list", headers=auth_headers)

        assert _content(response)[0]["status"] == DeviceStatus.OFFLINE.value

    def test_detail_agrees_with_the_list(
        self, client: TestClient, auth_headers: dict[str, str], db: Session
    ) -> None:
        device = register_device(client, auth_headers)
        self._age(db, device["device_id"], OFFLINE_THRESHOLD_SECONDS + 1)

        response = client.get(f"/devices/{device['device_id']}", headers=auth_headers)

        assert _content(response)["status"] == DeviceStatus.OFFLINE.value

    def test_stays_online_inside_the_window(
        self, client: TestClient, auth_headers: dict[str, str], db: Session
    ) -> None:
        device = register_device(client, auth_headers)
        self._age(db, device["device_id"], OFFLINE_THRESHOLD_SECONDS - 5)

        response = client.get("/devices/list", headers=auth_headers)

        assert _content(response)[0]["status"] == DeviceStatus.ONLINE.value

    def test_unknown_is_not_downgraded_to_offline(
        self, client: TestClient, auth_headers: dict[str, str], db: Session
    ) -> None:
        device = register_device(client, auth_headers)
        client.put(
            f"/devices/{device['device_id']}/heartbeat",
            json={"battery_level": 50, "wifi_mac": OTHER_MAC},
            headers=auth_headers,
        )
        self._age(db, device["device_id"], OFFLINE_THRESHOLD_SECONDS + 1)

        response = client.get("/devices/list", headers=auth_headers)

        # UNKNOWN says *which network* the device is on, not how recently it
        # spoke, so ageing must not overwrite it.
        assert _content(response)[0]["status"] == DeviceStatus.UNKNOWN.value

    def test_a_device_that_never_heartbeat_is_offline(
        self, client: TestClient, auth_headers: dict[str, str], db: Session
    ) -> None:
        device = register_device(client, auth_headers)
        stored = db.get(Device, uuid.UUID(device["device_id"]))
        stored.last_heartbeat = None
        db.flush()

        response = client.get("/devices/list", headers=auth_headers)

        assert _content(response)[0]["status"] == DeviceStatus.OFFLINE.value
