# syntax=docker/dockerfile:1

# --- Build stage -------------------------------------------------------------
FROM python:3.11-slim AS builder

WORKDIR /app

# Build tools are needed for psycopg2 and cryptography wheels, and are dropped
# from the runtime image below.
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# --- Runtime stage -----------------------------------------------------------
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq5 curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --shell /bin/bash appuser

COPY --from=builder /install /usr/local
COPY src/ ./src/
COPY migrations/ ./migrations/
COPY alembic.ini ./

# Never run the API as root.
USER appuser

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -fsS http://localhost:8000/health || exit 1

# --workers 1 is stated explicitly, not left to Uvicorn's default.
#
# Two structures live in process memory until Redis pub/sub lands in Phase 2:
# WebSocketManager's connection registry, and the revoked-token set. A second
# worker — or a second replica behind a load balancer — breaks both, and
# neither failure is loud:
#
#   Device status silently stops updating for whichever users landed on the
#   other process, and the dashboard shows stale state while looking live.
#
#   A token revoked by logout on one process is still accepted by the other,
#   so signing out does not end the session. That one is a security defect,
#   not a glitch.
#
# Scaling this image horizontally is therefore not safe yet. Run one instance.
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
