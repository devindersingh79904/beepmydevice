"""FastAPI application entry point.

Run locally with::

    uvicorn src.main:app --reload
"""

from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.config import settings
from src.middleware.logging_middleware import LoggingMiddleware
from src.routes import alerts, auth, devices, websocket
from src.utils.logger import get_logger

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


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Convert Pydantic validation failures into the standard error envelope.

    Reports every invalid field at once so the client can highlight all of them
    in one pass instead of surfacing them one request at a time.
    """
    raise NotImplementedError


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all that logs the traceback and returns a generic SYS_001 error.

    Internal details never reach the client.
    """
    raise NotImplementedError


@app.get("/health", tags=["Health"])
async def health_check() -> dict[str, Any]:
    """Liveness probe for the load balancer and uptime monitoring."""
    return {"status": "ok", "environment": settings.ENVIRONMENT}
