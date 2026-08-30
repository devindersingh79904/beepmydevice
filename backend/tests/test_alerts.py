"""Tests for /alerts/* endpoints and AlertService.

The authorization cases here are the most important tests in the suite: they
are what stop one household from beeping another household's devices.
"""


class TestAlertAuthorization:
    """The three checks that gate every send."""

    def test_rejects_target_owned_by_another_user_with_alert_003(self) -> None:
        raise NotImplementedError

    def test_rejects_targets_on_different_wifi_with_alert_001(self) -> None:
        raise NotImplementedError

    def test_rejects_non_admin_sender_with_alert_003(self) -> None:
        raise NotImplementedError

    def test_aborts_entire_send_when_one_target_fails_authorization(self) -> None:
        """No partial delivery: one bad target rejects the whole request."""
        raise NotImplementedError

    def test_rejects_device_marked_unknown_after_network_change(self) -> None:
        raise NotImplementedError


class TestSendAlert:
    """POST /alerts/send."""

    def test_sends_to_all_devices_on_network_when_ids_empty(self) -> None:
        raise NotImplementedError

    def test_routes_ios_devices_to_apns_and_android_to_firebase(self) -> None:
        raise NotImplementedError

    def test_returns_per_device_delivery_status(self) -> None:
        raise NotImplementedError

    def test_reports_alert_004_for_failed_push_without_failing_others(self) -> None:
        raise NotImplementedError

    def test_returns_alert_002_when_no_targets_available(self) -> None:
        raise NotImplementedError

    def test_writes_audit_row_for_every_attempt(self) -> None:
        raise NotImplementedError

    def test_clears_stale_push_token_on_unregistered_error(self) -> None:
        raise NotImplementedError


class TestAlertLogs:
    """GET /alerts/logs."""

    def test_returns_callers_alerts_newest_first(self) -> None:
        raise NotImplementedError

    def test_does_not_leak_other_users_alerts(self) -> None:
        raise NotImplementedError
