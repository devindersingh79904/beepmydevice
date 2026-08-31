"""Environment-driven configuration.

All deployment-specific values are loaded here exactly once and exposed via the
module-level ``settings`` singleton. Nothing else in the codebase should read
``os.environ`` directly — inject ``settings`` (or the specific values you need)
instead, so tests can substitute their own configuration.
"""

from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from src.utils.constants import JWT_EXPIRATION_DAYS

BASE_DIR: Path = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """Validated application settings sourced from the environment / .env file."""

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # --- Database ----------------------------------------------------------
    DATABASE_URL: str
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 3600
    DB_ECHO: bool = False

    # --- Authentication ----------------------------------------------------
    SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_DAYS: int = JWT_EXPIRATION_DAYS

    # --- Firebase Cloud Messaging (Android) --------------------------------
    FIREBASE_PROJECT_ID: str = ""
    FIREBASE_PRIVATE_KEY_ID: str = ""
    FIREBASE_PRIVATE_KEY: str = ""
    FIREBASE_CLIENT_EMAIL: str = ""

    # --- Apple Push Notification service (iOS) -----------------------------
    APPLE_TEAM_ID: str = ""
    APPLE_KEY_ID: str = ""
    APPLE_KEY_PATH: str = ""
    APPLE_BUNDLE_ID: str = "com.beepmydevice.app"
    APPLE_USE_SANDBOX: bool = True

    # --- Transactional email (password reset) ------------------------------
    # Optional: with no host configured the reset link is logged instead of
    # sent, which is what makes the flow testable without a mail account.
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_USE_TLS: bool = True
    SMTP_FROM_ADDRESS: str = "no-reply@beepmydevice.com"
    SMTP_TIMEOUT_SECONDS: int = 10
    SMTP_LINK_LIFETIME_HINT: str = "an hour"
    # Base URL the reset link points at. The app deep-links this path.
    PASSWORD_RESET_URL_BASE: str = "https://app.beepmydevice.com/reset-password"

    # --- Server ------------------------------------------------------------
    SERVER_HOST: str = "0.0.0.0"
    SERVER_PORT: int = 8000
    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    # --- Logging -----------------------------------------------------------
    LOG_LEVEL: str = "INFO"
    LOG_FILE_PATH: str = "./logs/beepmydevice.log"

    # --- CORS --------------------------------------------------------------
    CORS_ORIGINS: list[str] = Field(default_factory=list)

    @field_validator("SECRET_KEY")
    @classmethod
    def secret_key_must_be_changed(cls, value: str) -> str:
        """Refuse to start with the placeholder key from .env.example."""
        if value.startswith("your-super-secret-key"):
            raise ValueError(
                "SECRET_KEY is still the .env.example placeholder. "
                'Generate one: python -c "import secrets; '
                'print(secrets.token_urlsafe(64))"'
            )
        return value

    @staticmethod
    def _configured(*values: str) -> bool:
        """True only when every value is present and not a placeholder.

        `.env.example` ships values like ``your-project-id`` so the file reads
        as instructions. Copied to `.env` and left alone, a plain truthiness
        check calls that configured, and the setup verification then reports
        success while every push fails at the provider with an opaque error.
        """
        return all(
            value and not value.lower().startswith(("your-", "xxxxxxxxxx", "<")) for value in values
        )

    @property
    def is_production(self) -> bool:
        """True when running against the production environment."""
        return self.ENVIRONMENT.lower() == "production"

    @property
    def firebase_enabled(self) -> bool:
        """True when enough Firebase credentials are present to send Android push."""
        return self._configured(self.FIREBASE_PROJECT_ID, self.FIREBASE_PRIVATE_KEY)

    @property
    def smtp_enabled(self) -> bool:
        """True when enough SMTP settings are present to actually send mail."""
        return self._configured(self.SMTP_HOST, self.SMTP_FROM_ADDRESS)

    @property
    def apns_enabled(self) -> bool:
        """True when enough Apple credentials are present to send iOS push."""
        return self._configured(self.APPLE_TEAM_ID, self.APPLE_KEY_ID, self.APPLE_KEY_PATH)


@lru_cache
def get_settings() -> Settings:
    """Return the cached settings instance.

    Cached so the .env file is parsed once per process. Tests can clear the
    cache with ``get_settings.cache_clear()``.
    """
    return Settings()  # type: ignore[call-arg]  # populated from the environment


settings: Settings = get_settings()
