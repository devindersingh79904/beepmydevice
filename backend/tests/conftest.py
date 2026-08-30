"""Shared pytest fixtures.

Tests run against a transactional session that is rolled back after each test,
so cases never see each other's rows and the suite can run in any order.
"""

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session


@pytest.fixture(scope="session")
def test_engine() -> Generator[object, None, None]:
    """Create the schema once for the whole session, then drop it."""
    raise NotImplementedError


@pytest.fixture
def db(test_engine: object) -> Generator[Session, None, None]:
    """Yield a session wrapped in a transaction that is rolled back after."""
    raise NotImplementedError


@pytest.fixture
def client(db: Session) -> Generator[TestClient, None, None]:
    """Yield a TestClient with get_db overridden to use the test session."""
    raise NotImplementedError


@pytest.fixture
def auth_headers(client: TestClient) -> dict[str, str]:
    """Register a user and return Authorization + X-Correlation-ID headers."""
    raise NotImplementedError


@pytest.fixture
def mock_push(monkeypatch: pytest.MonkeyPatch) -> object:
    """Stub Firebase and APNs so no test ever hits a real push provider."""
    raise NotImplementedError
