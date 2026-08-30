"""Populate a local database with sample data for manual testing.

Creates one user, one WiFi network and four devices covering all supported
platforms, so the dashboard has something to render before any real device is
registered.

Usage:
    python -m scripts.seed_data
"""

from src.utils.logger import get_logger

logger = get_logger("seed_data")


def main() -> None:
    """Insert the sample rows, refusing to run against production."""
    raise NotImplementedError


if __name__ == "__main__":
    main()
