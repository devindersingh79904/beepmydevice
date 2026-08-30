"""Structured logging configured to the project's standard format.

Every log line is emitted as::

    [TIMESTAMP] [LEVEL] [CORRELATION_ID] [SERVICE] [MESSAGE]

The correlation ID is carried in a :class:`contextvars.ContextVar` so it
propagates automatically through async call stacks — service code never has to
thread it through as an argument just to log it.
"""

import logging
import sys
from contextvars import ContextVar
from pathlib import Path
from typing import Any

from src.config import settings
from src.utils.constants import (
    LOG_DATE_FORMAT,
    LOG_FORMAT,
    NO_CORRELATION_ID,
)

# Set by LoggingMiddleware at the start of each request; read by the filter below.
correlation_id_var: ContextVar[str] = ContextVar(
    "correlation_id", default=NO_CORRELATION_ID
)


class CorrelationIdFilter(logging.Filter):
    """Injects the ambient correlation ID and service name into every record."""

    def __init__(self, service_name: str) -> None:
        super().__init__()
        self._service_name = service_name

    def filter(self, record: logging.LogRecord) -> bool:
        record.correlation_id = correlation_id_var.get()
        # A caller may override the service per-record via extra={"service": ...}.
        if not hasattr(record, "service"):
            record.service = self._service_name
        return True


def set_correlation_id(correlation_id: str) -> None:
    """Bind a correlation ID to the current execution context."""
    correlation_id_var.set(correlation_id)


def get_correlation_id() -> str:
    """Return the correlation ID bound to the current execution context."""
    return correlation_id_var.get()


def get_logger(service_name: str) -> logging.Logger:
    """Return a logger that stamps every record with the standard fields.

    Args:
        service_name: Short name of the emitting component, e.g. ``auth_service``.
            Appears in the ``[SERVICE]`` field of each line.

    Returns:
        A configured logger. Repeated calls with the same name return the same
        logger without adding duplicate handlers.
    """
    logger = logging.getLogger(service_name)
    if logger.handlers:
        return logger

    logger.setLevel(settings.LOG_LEVEL.upper())
    formatter = logging.Formatter(fmt=LOG_FORMAT, datefmt=LOG_DATE_FORMAT)
    correlation_filter = CorrelationIdFilter(service_name)

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    console_handler.addFilter(correlation_filter)
    logger.addHandler(console_handler)

    if settings.LOG_FILE_PATH:
        log_path = Path(settings.LOG_FILE_PATH)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        file_handler = logging.FileHandler(log_path, encoding="utf-8")
        file_handler.setFormatter(formatter)
        file_handler.addFilter(correlation_filter)
        logger.addHandler(file_handler)

    # Handlers are attached here, not on the root logger.
    logger.propagate = False
    return logger


def log_exception(logger: logging.Logger, message: str, **context: Any) -> None:
    """Log an exception with its full stack trace and structured context.

    Always prefer this over ``logger.error(str(exc))`` — it preserves the
    traceback, which ``str(exc)`` discards.
    """
    detail = " ".join(f"{key}={value}" for key, value in context.items())
    logger.error(f"{message} {detail}".strip(), exc_info=True)
