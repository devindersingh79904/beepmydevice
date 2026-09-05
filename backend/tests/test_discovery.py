"""Tests for /devices/scan, /devices/discovered and DiscoveryService.

The subject here is a table written entirely from a client request body, so
most of these are about what a scan is *not* allowed to do. The scan itself
cannot be tested from the server side at all -- it runs on a phone, because
this API is a cloud relay and a scan executed here would enumerate the
datacenter rather than anybody's home.
"""

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.models.discovered_device import DiscoveredDevice
from src.models.wifi_network import WiFiNetwork
from src.schemas.discovery import DiscoveredDeviceInput
from src.services.discovery_service import DiscoveryService, UnknownScanNetworkError
from src.utils.constants import MAX_DISCOVERED_PER_SCAN, ErrorCode
from tests.conftest import OTHER_MAC, VALID_MAC, register_device, register_user


def _codes(response: object) -> list[str]:
    """Return the error codes in a response body."""
    return [error["code"] for error in response.json()["errors"]]  # type: ignore[attr-defined]


def _content(response: object) -> object:
    """Return data.content from a response body."""
    return response.json()["data"]["content"]  # type: ignore[attr-defined]


def _observation(ip: str, **overrides: object) -> dict[str, object]:
    """Build one valid observation."""
    payload: dict[str, object] = {
        "ip_address": ip,
        "device_name": "Living Room TV",
        "device_type": "tv",
        "discovered_via": "MDNS",
    }
    payload.update(overrides)
    return payload


def _submit(
    client: TestClient,
    headers: dict[str, str],
    devices: list[dict[str, object]],
    wifi_mac: str = VALID_MAC,
) -> object:
    """POST a scan."""
    return client.post(
        "/devices/scan",
        json={"wifi_mac": wifi_mac, "devices": devices},
        headers=headers,
    )


class TestScanAuthorization:
    """Who may write into somebody's dashboard.

    This is the whole security surface of the feature. The rows are unverified
    client claims, so the only thing standing between an arbitrary account and
    an arbitrary network is the admin check.
    """

    def test_records_a_scan_for_a_network_the_caller_administers(
        self, client: TestClient, auth_headers: dict[str, str]
    ) -> None:
        register_device(client, auth_headers)

        response = _submit(client, auth_headers, [_observation("192.168.1.50")])

        assert response.status_code == 200, response.text
        assert _content(response)["recorded"] == 1

    def test_rejects_a_scan_for_a_network_owned_by_someone_else(
        self, client: TestClient, auth_headers: dict[str, str], db: Session
    ) -> None:
        # The first account registers, and so owns VALID_MAC.
        register_device(client, auth_headers)
        intruder = register_user(client)

        response = _submit(client, intruder, [_observation("192.168.1.50")])

        assert response.status_code == 403
        assert _codes(response) == [ErrorCode.UNKNOWN_SCAN_NETWORK.value]
        # Nothing was written on the way to being refused.
        assert db.execute(select(DiscoveredDevice)).scalars().all() == []

    def test_rejects_a_scan_for_a_network_nobody_registered(
        self, client: TestClient, auth_headers: dict[str, str]
    ) -> None:
        register_device(client, auth_headers)

        response = _submit(client, auth_headers, [_observation("10.0.0.4")], wifi_mac=OTHER_MAC)

        # A scan must never *create* a network. If it could, naming a MAC would
        # be enough to claim the router it belongs to.
        assert response.status_code == 403
        assert _codes(response) == [ErrorCode.UNKNOWN_SCAN_NETWORK.value]

    def test_a_scan_creates_no_network(
        self, client: TestClient, auth_headers: dict[str, str], db: Session
    ) -> None:
        # Driven through the service rather than the endpoint: every request in
        # this suite shares one transaction, so the rollback that accompanies a
        # 403 would also undo the registration above and make the count prove
        # nothing. In production each request commits on its own.
        register_device(client, auth_headers)
        user_id = db.execute(select(WiFiNetwork.user_id)).scalars().first()
        assert user_id is not None
        before = len(db.execute(select(WiFiNetwork)).scalars().all())

        with pytest.raises(UnknownScanNetworkError):
            DiscoveryService(db).record_scan(
                user_id,
                OTHER_MAC,
                [DiscoveredDeviceInput(**_observation("10.0.0.4"))],  # type: ignore[arg-type]
            )

        assert len(db.execute(select(WiFiNetwork)).scalars().all()) == before


class TestScanValidation:
    """What the body is allowed to contain."""

    def test_rejects_a_non_ip_address(
        self, client: TestClient, auth_headers: dict[str, str]
    ) -> None:
        register_device(client, auth_headers)

        response = _submit(client, auth_headers, [_observation("not-an-address")])

        # This value is shown to the admin and is half the row's identity, so a
        # free-text field here would let a client write anything into a
        # dashboard.
        assert response.status_code == 422

    def test_rejects_a_scan_larger_than_a_home_network(
        self, client: TestClient, auth_headers: dict[str, str]
    ) -> None:
        register_device(client, auth_headers)
        too_many = [
            _observation(f"10.{index // 65536 % 256}.{index // 256 % 256}.{index % 256}")
            for index in range(MAX_DISCOVERED_PER_SCAN + 1)
        ]

        response = _submit(client, auth_headers, too_many)

        assert response.status_code == 422

    def test_rejects_an_unknown_discovery_source(
        self, client: TestClient, auth_headers: dict[str, str]
    ) -> None:
        register_device(client, auth_headers)

        response = _submit(
            client, auth_headers, [_observation("192.168.1.9", discovered_via="GUESSED")]
        )

        assert response.status_code == 422

    def test_accepts_an_observation_with_no_name(
        self, client: TestClient, auth_headers: dict[str, str]
    ) -> None:
        register_device(client, auth_headers)

        response = _submit(
            client,
            auth_headers,
            [_observation("192.168.1.9", device_name=None, device_type=None)],
        )

        # A sweep result usually has no name, and inventing "Device-9" would be
        # the client lying to the dashboard about what it knows.
        assert response.status_code == 200


class TestRescanning:
    """A second scan updates rather than accumulating."""

    def test_the_same_address_twice_is_one_row(
        self, client: TestClient, auth_headers: dict[str, str]
    ) -> None:
        register_device(client, auth_headers)

        _submit(client, auth_headers, [_observation("192.168.1.50")])
        _submit(client, auth_headers, [_observation("192.168.1.50")])

        rows = _content(client.get("/devices/discovered", headers=auth_headers))
        assert len(rows) == 1

    def test_one_scan_reporting_an_address_twice_is_one_row(
        self, client: TestClient, auth_headers: dict[str, str]
    ) -> None:
        register_device(client, auth_headers)

        # mDNS and the sweep both find the router; the client is not required
        # to have deduplicated them.
        response = _submit(
            client,
            auth_headers,
            [
                _observation("192.168.1.1", discovered_via="MDNS"),
                _observation("192.168.1.1", discovered_via="SWEEP"),
            ],
        )

        assert response.status_code == 200
        assert _content(response)["recorded"] == 1

    def test_a_later_scan_does_not_erase_a_name_it_did_not_learn(
        self, client: TestClient, auth_headers: dict[str, str]
    ) -> None:
        register_device(client, auth_headers)
        _submit(client, auth_headers, [_observation("192.168.1.50", device_name="Printer")])

        # The sweep sees the same address but cannot name it.
        _submit(
            client,
            auth_headers,
            [
                _observation(
                    "192.168.1.50", device_name=None, device_type=None, discovered_via="SWEEP"
                )
            ],
        )

        rows = _content(client.get("/devices/discovered", headers=auth_headers))
        assert rows[0]["device_name"] == "Printer"

    def test_forgets_observations_older_than_the_retention_window(
        self, client: TestClient, auth_headers: dict[str, str], db: Session
    ) -> None:
        register_device(client, auth_headers)
        _submit(client, auth_headers, [_observation("192.168.1.77")])

        stale = db.execute(select(DiscoveredDevice)).scalar_one()
        stale.last_seen = datetime.now(timezone.utc) - timedelta(days=3)
        db.flush()

        # Something unplugged days ago never appears in a scan again, so it has
        # to be dropped by one rather than waiting to be re-reported.
        _submit(client, auth_headers, [_observation("192.168.1.78")])

        rows = _content(client.get("/devices/discovered", headers=auth_headers))
        assert [row["ip_address"] for row in rows] == ["192.168.1.78"]


class TestReadingDiscovered:
    """GET /devices/discovered."""

    def test_empty_for_an_account_that_has_never_scanned(
        self, client: TestClient, auth_headers: dict[str, str]
    ) -> None:
        register_device(client, auth_headers)

        response = client.get("/devices/discovered", headers=auth_headers)

        assert response.status_code == 200
        assert _content(response) == []

    def test_empty_for_an_account_with_no_network_at_all(self, client: TestClient) -> None:
        headers = register_user(client)

        response = client.get("/devices/discovered", headers=headers)

        # A brand-new account renders an empty state, not an error.
        assert response.status_code == 200
        assert _content(response) == []

    def test_does_not_leak_another_networks_observations(
        self, client: TestClient, auth_headers: dict[str, str]
    ) -> None:
        register_device(client, auth_headers)
        _submit(client, auth_headers, [_observation("192.168.1.50")])

        other = register_user(client)
        register_device(client, other, wifi_mac=OTHER_MAC, push_token="other-token")

        assert _content(client.get("/devices/discovered", headers=other)) == []


class TestIgnoring:
    """DELETE /devices/discovered/{id}."""

    def test_removes_the_observation(
        self, client: TestClient, auth_headers: dict[str, str]
    ) -> None:
        register_device(client, auth_headers)
        _submit(client, auth_headers, [_observation("192.168.1.50")])
        row = _content(client.get("/devices/discovered", headers=auth_headers))[0]

        response = client.delete(
            f"/devices/discovered/{row['discovered_id']}", headers=auth_headers
        )

        assert response.status_code == 200
        assert _content(client.get("/devices/discovered", headers=auth_headers)) == []

    def test_a_later_scan_brings_it_back(
        self, client: TestClient, auth_headers: dict[str, str]
    ) -> None:
        register_device(client, auth_headers)
        _submit(client, auth_headers, [_observation("192.168.1.50")])
        row = _content(client.get("/devices/discovered", headers=auth_headers))[0]
        client.delete(f"/devices/discovered/{row['discovered_id']}", headers=auth_headers)

        _submit(client, auth_headers, [_observation("192.168.1.50")])

        # Ignoring is not curation: the table records what is on the network,
        # and the thing is demonstrably still there.
        assert len(_content(client.get("/devices/discovered", headers=auth_headers))) == 1

    def test_cannot_ignore_another_networks_observation(
        self, client: TestClient, auth_headers: dict[str, str]
    ) -> None:
        register_device(client, auth_headers)
        _submit(client, auth_headers, [_observation("192.168.1.50")])
        row = _content(client.get("/devices/discovered", headers=auth_headers))[0]
        intruder = register_user(client)

        response = client.delete(f"/devices/discovered/{row['discovered_id']}", headers=intruder)

        assert response.status_code == 403
        assert _codes(response) == [ErrorCode.UNKNOWN_SCAN_NETWORK.value]

    def test_an_unknown_id_reports_the_same_thing_as_someone_elses(
        self, client: TestClient, auth_headers: dict[str, str]
    ) -> None:
        register_device(client, auth_headers)

        response = client.delete(f"/devices/discovered/{uuid.uuid4()}", headers=auth_headers)

        # Telling the two apart would let a caller probe which ids exist on
        # networks they cannot see.
        assert response.status_code == 403
        assert _codes(response) == [ErrorCode.UNKNOWN_SCAN_NETWORK.value]


class TestDiscoveredIsNotADevice:
    """An observation must never become alertable."""

    def test_a_discovered_id_is_not_a_device_id(
        self, client: TestClient, auth_headers: dict[str, str]
    ) -> None:
        register_device(client, auth_headers)
        _submit(client, auth_headers, [_observation("192.168.1.50")])
        row = _content(client.get("/devices/discovered", headers=auth_headers))[0]

        response = client.post(
            "/alerts/send",
            json={"device_ids": [row["discovered_id"]]},
            headers=auth_headers,
        )

        # A smart TV has no app on it to ring. The two id spaces are separate
        # tables and naming one where the other is expected finds nothing.
        assert response.status_code in (400, 404)

    def test_discovered_rows_do_not_appear_in_the_device_list(
        self, client: TestClient, auth_headers: dict[str, str]
    ) -> None:
        register_device(client, auth_headers)
        _submit(client, auth_headers, [_observation("192.168.1.50")])

        listed = _content(client.get("/devices/list", headers=auth_headers))

        # /devices/list is what the alert screen reads. Mixing observations
        # into it would put a Send alert button over a printer.
        assert len(listed) == 1
