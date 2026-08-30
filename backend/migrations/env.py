"""Alembic migration environment.

Pulls the connection string and model metadata from the application itself, so
migrations can never drift from the configuration the API actually uses.
"""

from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from src.config import settings
from src.database import Base
from src.models import AlertLog, Device, User, WiFiNetwork  # noqa: F401

config = context.config
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Emit SQL to stdout without connecting to a database."""
    raise NotImplementedError


def run_migrations_online() -> None:
    """Apply migrations against a live connection."""
    raise NotImplementedError


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
