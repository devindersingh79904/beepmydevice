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

    def test_registers_guest_when_no_token_supplied(self) -> None:
        """No Authorization header means a guest, not a rejection."""
        raise NotImplementedError

    def test_guest_registration_returns_device_token(self) -> None:
        raise NotImplementedError

    def test_owned_registration_returns_null_device_token(self) -> None:
        raise NotImplementedError

    def test_rejects_present_but_invalid_token_instead_of_creating_guest(self) -> None:
        """An expired session must not silently downgrade a device to a guest."""
        raise NotImplementedError

    def test_guest_cannot_register_against_unclaimed_network(self) -> None:
        """A guest joins an existing network; it never creates an ownerless one."""
        raise NotImplementedError

    def test_guest_device_has_null_user_id(self) -> None:
        raise NotImplementedError


class TestDeviceList:
    """GET /devices/list."""

    def test_returns_all_devices_on_network_including_guests(self) -> None:
        """Scoped by network, not owner -- guests are exactly what admins hunt for."""
        raise NotImplementedError

    def test_does_not_return_devices_from_another_network(self) -> None:
        raise NotImplementedError

    def test_flags_guest_devices_with_is_guest(self) -> None:
        raise NotImplementedError

    def test_guest_device_token_cannot_list_devices(self) -> None:
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

    def test_accepts_guest_device_token(self) -> None:
        raise NotImplementedError

    def test_device_token_cannot_heartbeat_a_different_device(self) -> None:
        """A device token is scoped to one device_id and must not cross over."""
        raise NotImplementedError


class TestDeviceRemoval:
    """DELETE /devices/{device_id}."""

    def test_removes_device(self) -> None:
        raise NotImplementedError

    def test_cannot_remove_another_users_device(self) -> None:
        raise NotImplementedError

    def test_admin_can_remove_guest_on_their_network(self) -> None:
        """Removal is the admin's control over open guest registration."""
        raise NotImplementedError
