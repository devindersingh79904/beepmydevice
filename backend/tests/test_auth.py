"""Tests for /auth/* endpoints and AuthService."""


class TestRegister:
    """POST /auth/register."""

    def test_registers_new_user_and_returns_token(self) -> None:
        raise NotImplementedError

    def test_rejects_duplicate_email(self) -> None:
        raise NotImplementedError

    def test_rejects_invalid_email_with_val_003(self) -> None:
        raise NotImplementedError

    def test_rejects_short_password_with_val_004(self) -> None:
        raise NotImplementedError

    def test_returns_all_validation_errors_at_once(self) -> None:
        """A bad email and a weak password produce two entries in errors[]."""
        raise NotImplementedError

    def test_never_stores_plain_text_password(self) -> None:
        raise NotImplementedError


class TestLogin:
    """POST /auth/login."""

    def test_returns_token_for_valid_credentials(self) -> None:
        raise NotImplementedError

    def test_rejects_wrong_password_with_auth_001(self) -> None:
        raise NotImplementedError

    def test_does_not_reveal_whether_email_exists(self) -> None:
        """Unknown email and wrong password must return the same error."""
        raise NotImplementedError


class TestTokenVerification:
    """Token handling on protected endpoints."""

    def test_rejects_expired_token_with_auth_002(self) -> None:
        raise NotImplementedError

    def test_rejects_malformed_token_with_auth_003(self) -> None:
        raise NotImplementedError

    def test_echoes_correlation_id_from_request_header(self) -> None:
        raise NotImplementedError
