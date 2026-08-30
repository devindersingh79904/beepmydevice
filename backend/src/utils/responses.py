"""Builders for the standard API response envelope.

Every endpoint returns the same shape, so clients can parse one structure::

    {
      "success": bool,
      "status_code": int,
      "data": {"content": ..., "pagination": ...} | null,
      "errors": [{"field": ..., "message": ..., "code": ...}],
      "correlation_id": str,
      "timestamp": ISO-8601,
      "message": str
    }

Route handlers must build responses through these helpers rather than
returning raw dicts — that is what keeps the contract consistent.
"""

from datetime import datetime, timezone
from math import ceil
from typing import Any

from src.utils.constants import ERROR_MESSAGES, ErrorCode
from src.utils.logger import get_correlation_id


def _timestamp() -> str:
    """Return the current UTC time as an ISO-8601 string with milliseconds."""
    return (
        datetime.now(timezone.utc)
        .isoformat(timespec="milliseconds")
        .replace("+00:00", "Z")
    )


def build_pagination(total_count: int, page: int, page_size: int) -> dict[str, Any]:
    """Build the pagination block for a list response.

    Args:
        total_count: Total number of matching rows, ignoring pagination.
        page: 1-indexed page number that was requested.
        page_size: Number of items per page.

    Returns:
        The pagination dict that belongs under ``data.pagination``.
    """
    total_pages = ceil(total_count / page_size) if page_size else 0
    return {
        "current_page": page,
        "total_pages": total_pages,
        "total_count": total_count,
        "page_size": page_size,
        "has_next": page < total_pages,
        "has_prev": page > 1,
    }


def success_response(
    content: Any,
    message: str = "Success",
    status_code: int = 200,
    pagination: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Build a successful response envelope.

    Args:
        content: Payload — a single object for detail endpoints, a list for
            collection endpoints. Always nested under ``data.content``.
        message: Human-readable summary for the client.
        status_code: HTTP status to report inside the body.
        pagination: Optional pagination block from :func:`build_pagination`.

    Returns:
        The complete response envelope.
    """
    data: dict[str, Any] = {"content": content}
    if pagination is not None:
        data["pagination"] = pagination

    return {
        "success": True,
        "status_code": status_code,
        "data": data,
        "errors": [],
        "correlation_id": get_correlation_id(),
        "timestamp": _timestamp(),
        "message": message,
    }


def build_error(
    code: ErrorCode,
    field: str | None = None,
    message: str | None = None,
) -> dict[str, Any]:
    """Build a single entry for the ``errors`` array.

    Args:
        code: Stable error code from the shared vocabulary.
        field: Request field the error applies to, for validation failures.
        message: Overrides the default user-facing text for ``code``.

    Returns:
        One error object.
    """
    error: dict[str, Any] = {
        "code": code.value,
        "message": message or ERROR_MESSAGES.get(code, "An error occurred"),
    }
    if field is not None:
        error["field"] = field
    return error


def error_response(
    errors: list[dict[str, Any]],
    status_code: int = 400,
) -> dict[str, Any]:
    """Build a failed response envelope.

    ``errors`` is always an array, even for a single failure, so clients only
    ever write one rendering path.

    Args:
        errors: One or more entries from :func:`build_error`.
        status_code: HTTP status to report inside the body.

    Returns:
        The complete response envelope with ``data`` set to ``None``.
    """
    return {
        "success": False,
        "status_code": status_code,
        "data": None,
        "errors": errors,
        "correlation_id": get_correlation_id(),
        "timestamp": _timestamp(),
    }


def single_error_response(
    code: ErrorCode,
    status_code: int = 400,
    field: str | None = None,
    message: str | None = None,
) -> dict[str, Any]:
    """Convenience wrapper for the common one-error case."""
    return error_response([build_error(code, field, message)], status_code)
