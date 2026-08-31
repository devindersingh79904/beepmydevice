"""Shared pytest fixtures.

Tests run against a transactional session that is rolled back after each test,
so cases never see each other's rows and the suite can run in any order.

The suite needs a real PostgreSQL: the models use ``UUID`` and ``ARRAY``, which
have no SQLite equivalent, and testing the alert authorization rules against a
different database than production runs would defeat the point. Start one with::

    cd backend && docker compose -f docker/docker-compose.yml up -d db

If no database is reachable the whole suite skips with that instruction rather
than reporting spurious failures.
"""

import os
import uuid
from collections.abc import Generator
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine, make_url
from sqlalchemy.orm import Session, sessionmaker

from src.config import settings
from src.database import Base, get_db
from src.main import app
from src.models import Device, User, WiFiNetwork  # noqa: F401  (registers tables)
from src.services.notification_service import NotificationService, PushOutcome

SKIP_REASON = (
    "PostgreSQL is not reachable. Start it with: "
    "docker compose -f docker/docker-compose.yml up -d db"
)


def _test_database_url() -> str:
    """Return the URL for the test database, derived from the dev one.

    A separate database, not a separate schema: ``drop_all`` at the end of the
    session would otherwise be one typo away from wiping development data.
    """
    override = os.getenv("TEST_DATABASE_URL")
    if override:
        return override

    url = make_url(settings.DATABASE_URL)
    url = url.set(database=f"{url.database}_test")

    # "localhost" resolves to ::1 first on Windows, and anything else bound to
    # IPv6 loopback -- a WSL port relay, a second Postgres -- shadows the port
    # Docker published on 0.0.0.0. Pinning to IPv4 makes the suite talk to the
    # container it was told to use instead of whatever answered first.
    if url.host == "localhost":
        url = url.set(host="127.0.0.1")

    # render_as_string(hide_password=False), not str(url): SQLAlchemy's __str__
    # masks the password as literal "***", which then gets sent as the password.
    return url.render_as_string(hide_password=False)


def _ensure_database_exists(url: str) -> None:
    """Create the test database if it is not there yet."""
    target = make_url(url)
    admin_url = target.set(database="postgres")
    admin_engine = create_engine(
        admin_url.render_as_string(hide_password=False), isolation_level="AUTOCOMMIT"
    )
    with admin_engine.connect() as connection:
        exists = connection.execute(
            text("SELECT 1 FROM pg_database WHERE datname = :name"),
            {"name": target.database},
        ).scalar()
        if not exists:
            connection.execute(text(f'CREATE DATABASE "{target.database}"'))
    admin_engine.dispose()


@pytest.fixture(scope="session")
def test_engine() -> Generator[object, None, None]:
    """Create the schema once for the whole session, then drop it."""
    url = _test_database_url()
    try:
        _ensure_database_exists(url)
        engine = create_engine(url)
        with engine.connect():
            pass
    except Exception as exc:  # pragma: no cover - environment-dependent
        # The cause is included: "not reachable" alone sends people looking at
        # Docker when the real problem is a password or a missing database.
        pytest.skip(f"{SKIP_REASON} Underlying error: {exc}", allow_module_level=True)

    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture
def db(test_engine: Engine) -> Generator[Session, None, None]:
    """Yield a session wrapped in a transaction that is rolled back after."""
    connection = test_engine.connect()
    transaction = connection.begin()
    # join_transaction_mode="create_savepoint" keeps a rollback inside the app
    # (a route raising, say) scoped to a SAVEPOINT instead of tearing down the
    # outer transaction this fixture relies on for isolation.
    session = sessionmaker(
        bind=connection,
        autocommit=False,
        autoflush=False,
        join_transaction_mode="create_savepoint",
    )()

    yield session

    session.close()
    # Rolling back the outer transaction discards everything the test wrote,
    # including anything the request-scoped session thought it had committed.
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db: Session) -> Generator[TestClient, None, None]:
    """Yield a TestClient with get_db overridden to use the test session."""

    def override_get_db() -> Generator[Session, None, None]:
        # Deliberately does not commit: the fixture's outer transaction owns the
        # boundary, and committing here would escape the rollback.
        try:
            yield db
        except Exception:
            db.rollback()
            raise

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def auth_headers(client: TestClient) -> dict[str, str]:
    """Register a user and return Authorization + X-Correlation-ID headers."""
    return register_user(client)


def register_user(client: TestClient, email: str | None = None) -> dict[str, str]:
    """Register a fresh account and return headers that authenticate as it."""
    response = client.post(
        "/auth/register",
        json={
            "email": email or f"user-{uuid.uuid4().hex[:12]}@example.com",
            "password": "CorrectHorse9",
        },
    )
    assert response.status_code == 201, response.text
    token = response.json()["data"]["content"]["token"]
    return {
        "Authorization": f"Bearer {token}",
        "X-Correlation-ID": str(uuid.uuid4()),
    }


class PushRecorder:
    """Records push attempts and lets a test force one to fail."""

    def __init__(self) -> None:
        self.firebase: list[str] = []
        self.apns: list[str] = []
        self.failing_tokens: set[str] = set()
        self.dead_tokens: set[str] = set()

    @property
    def all_tokens(self) -> list[str]:
        """Every token pushed to, in the order the providers saw them."""
        return self.firebase + self.apns

    def fail(self, push_token: str) -> None:
        """Make pushes to this token report a transient failure."""
        self.failing_tokens.add(push_token)

    def reject(self, push_token: str) -> None:
        """Make the provider disown this token, as it does for a deleted app."""
        self.dead_tokens.add(push_token)

    def outcome_for(self, push_token: str) -> PushOutcome:
        """Decide what the fake provider reports for this token."""
        if push_token in self.dead_tokens:
            return PushOutcome.TOKEN_INVALID
        if push_token in self.failing_tokens:
            return PushOutcome.TRANSIENT_FAILURE
        return PushOutcome.DELIVERED


@pytest.fixture
def mock_push(monkeypatch: pytest.MonkeyPatch) -> PushRecorder:
    """Stub Firebase and APNs so no test ever hits a real push provider."""
    recorder = PushRecorder()

    def fake_firebase(
        _self: NotificationService, push_token: str, _title: str, _body: str
    ) -> PushOutcome:
        recorder.firebase.append(push_token)
        return recorder.outcome_for(push_token)

    def fake_apns(
        _self: NotificationService, push_token: str, _title: str, _body: str
    ) -> PushOutcome:
        recorder.apns.append(push_token)
        return recorder.outcome_for(push_token)

    monkeypatch.setattr(NotificationService, "send_firebase_message", fake_firebase)
    monkeypatch.setattr(NotificationService, "send_apns_message", fake_apns)
    return recorder


# ---------------------------------------------------------------------------
# Builders
# ---------------------------------------------------------------------------

VALID_MAC = "00:1A:2B:3C:4D:5E"
OTHER_MAC = "AA:BB:CC:DD:EE:FF"


def device_payload(**overrides: Any) -> dict[str, Any]:
    """Build a valid POST /devices/register body."""
    payload: dict[str, Any] = {
        "device_name": "Test Device",
        "device_type": "android",
        "device_os_version": "14",
        "push_token": f"push-{uuid.uuid4().hex[:16]}",
        "wifi_mac": VALID_MAC,
        "network_name": "Home-WiFi",
    }
    payload.update(overrides)
    return payload


def register_device(
    client: TestClient,
    headers: dict[str, str] | None = None,
    **overrides: Any,
) -> dict[str, Any]:
    """Register a device and return the response content.

    Passing no headers registers a guest, which is exactly how the app behaves
    for someone who opens it without an account.
    """
    response = client.post(
        "/devices/register", json=device_payload(**overrides), headers=headers or {}
    )
    assert response.status_code == 201, response.text
    return response.json()["data"]["content"]
