"""PostgreSQL connection, session factory and declarative base.

Sessions are handed out through :func:`get_db`, a FastAPI dependency. Route
handlers never construct a session themselves — they declare it as a
dependency, which keeps the request-scoped lifecycle (commit / rollback /
close) in exactly one place and makes the session trivial to override in tests.
"""

from collections.abc import Generator
from typing import Any

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from src.config import settings
from src.utils.logger import get_logger

logger = get_logger("database")

engine = create_engine(
    settings.DATABASE_URL,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_timeout=settings.DB_POOL_TIMEOUT,
    pool_recycle=settings.DB_POOL_RECYCLE,
    # Verifies a pooled connection is still alive before handing it out, which
    # avoids stale-connection errors after a database restart.
    pool_pre_ping=True,
    echo=settings.DB_ECHO,
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


class Base(DeclarativeBase):
    """Declarative base shared by every ORM model."""

    # Populated by SQLAlchemy on each mapped class.
    metadata: Any


def get_db() -> Generator[Session, None, None]:
    """Yield a request-scoped database session.

    Commits on success, rolls back on any exception, and always closes. Use as
    a FastAPI dependency::

        @router.get("/devices")
        def list_devices(db: Session = Depends(get_db)) -> ...:
            ...

    Yields:
        An open SQLAlchemy session.
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        logger.error("Session rolled back due to an unhandled error", exc_info=True)
        raise
    finally:
        db.close()
