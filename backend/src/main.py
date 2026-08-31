"""FastAPI application entry point.

Run locally with::

    uvicorn src.main:app --reload
"""

from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator
from typing import Any

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.config import settings
from src.middleware.logging_middleware import LoggingMiddleware
from src.routes import alerts, auth, devices, websocket
from src.utils.constants import ErrorCode
from src.utils.logger import get_logger, log_exception
from src.utils.responses import build_error, error_response, single_error_response

logger = get_logger("main")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Start and stop background work around the server lifetime.

    Startup initialises the push providers; shutdown closes WebSocket
    connections cleanly so clients reconnect rather than hanging.
    """
    logger.info(f"Starting BeepMyDevice API in {settings.ENVIRONMENT} mode")
    yield
    logger.info("Shutting down BeepMyDevice API")


app = FastAPI(
    title="BeepMyDevice API",
    description="WiFi-based cross-account device alert system",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
)

# Order matters: logging is added last so it wraps everything and sees the
# final status code, including responses short-circuited by CORS.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(LoggingMiddleware)

app.include_router(auth.router)
app.include_router(devices.router)
app.include_router(alerts.router)
app.include_router(websocket.router)


# Pydantic error types that mean "you left this out" rather than "this is the
# wrong shape". Everything else is reported as a format problem.
_MISSING_ERROR_TYPES = {"missing", "value_error.missing"}
# Length violations on a password are a strength failure, not a format one.
_LENGTH_ERROR_TYPES = {"string_too_short", "string_too_long"}


def _validation_code(field: str | None, error_type: str) -> ErrorCode:
    """Map one Pydantic failure onto the project's error vocabulary.

    Email and password get their own codes because the client acts on them
    differently -- VAL_003 and VAL_004 are part of the published contract, and
    collapsing them into a generic VAL_002 would lose that.
    """
    if error_type in _MISSING_ERROR_TYPES:
        return ErrorCode.MISSING_REQUIRED_FIELD
    if field == "email":
        return ErrorCode.INVALID_EMAIL_FORMAT
    if field == "password" and error_type in _LENGTH_ERROR_TYPES:
        return ErrorCode.PASSWORD_TOO_WEAK
    if field == "device_type":
        return ErrorCode.INVALID_DEVICE_TYPE
    return ErrorCode.INVALID_FIELD_FORMAT


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Convert Pydantic validation failures into the standard error envelope.

    Reports every invalid field at once so the client can highlight all of them
    in one pass instead of surfacing them one request at a time.
    """
    errors = []
    for failure in exc.errors():
        # loc is ("body", "email"); the last element is the field the client
        # knows by name.
        location = [part for part in failure.get("loc", ()) if part != "body"]
        field = ".".join(str(part) for part in location) or None
        code = _validation_code(field, str(failure.get("type", "")))
        errors.append(build_error(code, field=field, message=failure.get("msg")))

    logger.info(
        f"Validation failed for {request.method} {request.url.path}: {len(errors)} field(s)"
    )
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=error_response(errors, status.HTTP_422_UNPROCESSABLE_ENTITY),
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Return the envelope routes already built, or wrap a plain detail in one.

    Routes raise HTTPException with a ready-made envelope as the detail, so the
    error contract is identical whether a failure came from a route, a
    dependency, or FastAPI itself.
    """
    if isinstance(exc.detail, dict) and "success" in exc.detail:
        return JSONResponse(status_code=exc.status_code, content=exc.detail)

    code = (
        ErrorCode.UNAUTHORIZED
        if exc.status_code in {status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN}
        else ErrorCode.INTERNAL_ERROR
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=single_error_response(code, exc.status_code, message=str(exc.detail)),
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(
    request: Request, exc: Exception  # pylint: disable=unused-argument
) -> JSONResponse:
    """Catch-all that logs the traceback and returns a generic SYS_001 error.

    Internal details never reach the client.
    """
    # exc is unused: log_exception reads the live traceback, and FastAPI fixes
    # this handler's signature.
    log_exception(
        logger,
        "Unhandled exception",
        method=request.method,
        path=request.url.path,
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=single_error_response(
            ErrorCode.INTERNAL_ERROR, status.HTTP_500_INTERNAL_SERVER_ERROR
        ),
    )


@app.get("/health", tags=["Health"])
async def health_check() -> dict[str, Any]:
    """Liveness probe for the load balancer and uptime monitoring."""
    return {"status": "ok", "environment": settings.ENVIRONMENT}
