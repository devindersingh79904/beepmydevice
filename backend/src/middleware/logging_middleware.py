"""Request/response logging and correlation-ID propagation."""

import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from src.utils.constants import CORRELATION_ID_HEADER, SLOW_REQUEST_THRESHOLD_MS
from src.utils.logger import get_logger, set_correlation_id

logger = get_logger("api")

MILLISECONDS_PER_SECOND = 1000


class LoggingMiddleware(BaseHTTPMiddleware):
    """Binds a correlation ID to the request and logs both sides of it.

    This runs before anything else so every downstream log line, including
    those emitted from services, carries the same correlation ID without any
    explicit plumbing.
    """

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        """Log the request, time it, log the response, echo the correlation ID.

        The client supplies the ID via the X-Correlation-ID header; one is
        generated when absent so a request is never untraceable. Requests
        slower than SLOW_REQUEST_THRESHOLD_MS are logged at WARNING.
        """
        correlation_id = request.headers.get(CORRELATION_ID_HEADER) or str(uuid.uuid4())
        set_correlation_id(correlation_id)

        logger.info(f"--> {request.method} {request.url.path}")
        started = time.perf_counter()

        try:
            response = await call_next(request)
        except Exception:
            duration_ms = (time.perf_counter() - started) * MILLISECONDS_PER_SECOND
            # The exception handler in main.py turns this into SYS_001; log the
            # timing here so a failed request is still visible in the latency
            # record rather than silently missing from it.
            logger.error(
                f"<-- {request.method} {request.url.path} raised after {duration_ms:.1f}ms"
            )
            raise

        duration_ms = (time.perf_counter() - started) * MILLISECONDS_PER_SECOND
        message = (
            f"<-- {request.method} {request.url.path} "
            f"{response.status_code} in {duration_ms:.1f}ms"
        )
        if duration_ms > SLOW_REQUEST_THRESHOLD_MS:
            logger.warning(f"{message} (slow)")
        else:
            logger.info(message)

        # Echoed so the client can tie its own logs to the server's.
        response.headers[CORRELATION_ID_HEADER] = correlation_id
        return response
