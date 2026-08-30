"""Tests for /devices/* endpoints and DeviceService."""


class TestDeviceRegistration:
    """POST /devices/register."""

    def test_registers_device_and_returns_id(self) -> None:
        raise NotImplementedError

    def test_creates_wifi_network_row_on_first_device(self) -> None:
        raise NotImplementedError

    def test_reuses_existing_wifi_network_for_same_mac(self) -> None:
        """Two devices on one router must share a single wifi_id."""
        raise NotImplementedError

    def test_rejects_unsupported_device_type_with_device_003(self) -> None:
        raise NotImplementedError

    def test_rejects_malformed_wifi_mac(self) -> None:
        raise NotImplementedError

    def test_requires_authentication(self) -> None:
        raise NotImplementedError


class TestDeviceList:
    """GET /devices/list."""

    def test_returns_only_devices_owned_by_caller(self) -> None:
        raise NotImplementedError

    def test_paginates_with_defaults(self) -> None:
        raise NotImplementedError

    def test_caps_limit_at_max_page_size(self) -> None:
        raise NotImplementedError

    def test_response_nests_pagination_under_data(self) -> None:
        raise NotImplementedError

    def test_never_exposes_push_token(self) -> None:
        raise NotImplementedError


class TestHeartbeat:
    """PUT /devices/{device_id}/heartbeat."""

    def test_sets_status_online_and_updates_battery(self) -> None:
        raise NotImplementedError

    def test_sets_status_unknown_when_wifi_mac_changed(self) -> None:
        """A device that moved networks must not stay alertable."""
        raise NotImplementedError

    def test_rejects_battery_level_above_100(self) -> None:
        raise NotImplementedError

    def test_broadcasts_status_change_over_websocket(self) -> None:
        raise NotImplementedError


class TestDeviceRemoval:
    """DELETE /devices/{device_id}."""

    def test_removes_device(self) -> None:
        raise NotImplementedError

    def test_cannot_remove_another_users_device(self) -> None:
        raise NotImplementedError
