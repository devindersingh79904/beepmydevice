"""Request/response logging and correlation-ID propagation."""

import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from src.utils.constants import CORRELATION_ID_HEADER, SLOW_REQUEST_THRESHOLD_MS
from src.utils.logger import get_logger, set_correlation_id

logger = get_logger("api")


class LoggingMiddleware(BaseHTTPMiddleware):
    """Binds a correlation ID to the request and logs both sides of it.

    This runs before anything else so every downstream log line, including
    those emitted from services, carries the same correlation ID without any
    explicit plumbing.
    """

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        """Log the request, time it, log the response, echo the correlation ID.

        The client supplies the ID via the X-Correlation-ID header; one is
        generated when absent so a request is never untraceable. Requests
        slower than SLOW_REQUEST_THRESHOLD_MS are logged at WARNING.
        """
        raise NotImplementedError
