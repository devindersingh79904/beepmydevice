"""Create the database schema from the ORM models.

Convenience for a fresh local database. Alembic remains the source of truth for
schema changes -- anything that must reach production goes through a migration,
never through this script.

Usage:
    python -m scripts.init_db
"""

from src.database import Base, engine
from src.models import AlertLog, Device, User, WiFiNetwork  # noqa: F401
from src.utils.logger import get_logger

logger = get_logger("init_db")


def main() -> None:
    """Create every table that does not already exist."""
    raise NotImplementedError


if __name__ == "__main__":
    main()
