# BeepMyDevice — Backend

FastAPI service that owns authentication, the device registry, alert
authorization and push delivery.

## Quick Start

```bash
cd backend
python -m venv .venv
source .venv/bin/activate         # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Generate a signing key and paste it into SECRET_KEY:
python -c "import secrets; print(secrets.token_urlsafe(64))"

# Start PostgreSQL (or point DATABASE_URL at your own):
docker compose -f docker/docker-compose.yml up -d db

python -m alembic upgrade head
uvicorn src.main:app --reload --workers 1
```

Swagger UI: <http://localhost:8000/docs> · Health: <http://localhost:8000/health>

**One worker, deliberately.** `WebSocketManager` and the token revocation list
both live in process memory, so a second worker would leave some dashboards
never receiving status updates and some revoked tokens still working. Redis
lifts this in Phase 2.

The app refuses to start while `SECRET_KEY` is still the placeholder from
`.env.example` — that check exists so a placeholder key can never reach
production.

### With Docker

```bash
cd backend/docker
docker compose up --build
```

Brings up PostgreSQL and the API together. The API waits on the database
healthcheck, so migrations never run against a cold database.

## Tests

```bash
pytest                                   # 59 tests
pytest --cov=src --cov-report=term-missing
pytest tests/test_alerts.py::TestAlertAuthorization   # the security cases
```

The suite needs a real PostgreSQL — the models use `UUID` and `ARRAY`, which
SQLite has no equivalent for, and testing the alert rules against a different
database than production runs would defeat the point. It creates and drops its
own `<database>_test` database, and skips with an explanation if nothing is
reachable.

## Prerequisites

- Python 3.11 or 3.12. **Not 3.13+**: several pinned dependencies
  (`psycopg2-binary`, `pydantic`) publish no wheels for it and fall back to
  building from source, which needs `pg_config` and a compiler.
- PostgreSQL 12+
- A Firebase project with Cloud Messaging enabled — Android push
- An Apple Developer account with an APNs `.p8` key — iOS push

Both push providers are optional for local work: `settings.firebase_enabled` and
`settings.apns_enabled` report false when credentials are absent, and the
service degrades to logging what it would have sent.

## Structure

```
src/
├── main.py          FastAPI app, middleware order, exception handlers
├── config.py        Pydantic settings — the only place the environment is read
├── database.py      Engine, session factory, get_db dependency
├── models/          SQLAlchemy ORM — users, wifi_networks, devices, alert_logs
├── schemas/         Pydantic request/response contracts
├── services/        All business logic
├── routes/          HTTP + WebSocket endpoints (thin)
├── middleware/       JWT dependency, request/response logging
└── utils/           logger, responses, validators, constants, concurrency
```

The dependency direction is strict: `routes/` → `services/` → `models/`, never
upward. See [`docs/CODING_STYLE.md`](docs/CODING_STYLE.md).

## Technologies

| Concern | Choice |
|---|---|
| Framework | FastAPI 0.104 + Uvicorn |
| ORM | SQLAlchemy 2.0 (typed `Mapped[]` style) |
| Migrations | Alembic |
| Validation | Pydantic v2 + pydantic-settings |
| Auth | python-jose (JWT), bcrypt |
| Push | firebase-admin (FCM), httpx over HTTP/2 (APNs) |
| Tests | pytest, pytest-asyncio |
| Tooling | black, pylint, mypy |

## Environment Variables

Full template in `.env.example`. The groups:

| Group | Purpose |
|---|---|
| `DATABASE_URL`, `DB_POOL_*` | PostgreSQL connection and pool sizing |
| `SECRET_KEY`, `JWT_ALGORITHM`, `ACCESS_TOKEN_EXPIRE_DAYS` | Token signing |
| `FIREBASE_*` | Service-account credentials for Android push |
| `APPLE_*` | Team ID, key ID and `.p8` path for iOS push |
| `SERVER_*`, `DEBUG`, `ENVIRONMENT` | Process configuration |
| `LOG_LEVEL`, `LOG_FILE_PATH` | Logging |
| `CORS_ORIGINS` | JSON array of allowed origins |

These are server-side secrets. Nothing here belongs in `frontend/.env`, which
ships inside the app bundle and is readable by anyone who downloads it.

## API

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/register` | Create an account, return a token |
| POST | `/auth/login` | Exchange credentials for a JWT |
| POST | `/auth/logout` | Invalidate a token |
| POST | `/devices/register` | Register a device on its WiFi network |
| GET | `/devices/list` | List the caller's devices, paginated |
| GET | `/devices/{id}` | One device's details |
| PUT | `/devices/{id}/heartbeat` | Report status and battery, every 30s |
| DELETE | `/devices/{id}` | Unregister a device |
| POST | `/alerts/send` | Beep target devices |
| GET | `/alerts/logs` | Alert history, paginated |
| WS | `/ws/status` | Live status and battery updates |

Full reference including the response envelope and error codes:
[`docs/API.md`](../docs/API.md).

## Testing

```bash
pytest                                    # all
pytest tests/test_alerts.py               # one file
pytest tests/test_alerts.py::TestAlertAuthorization   # one class
pytest --cov=src --cov-report=term-missing
```

Coverage floor is 70%, enforced by `pyproject.toml`. Firebase and APNs are
always mocked — a test that reaches a real push provider is not a test.

CI is currently disabled; run the checks locally. See the root
[`README.md`](../README.md#testing).

## Coding Standards

[`docs/CODING_STYLE.md`](docs/CODING_STYLE.md) is binding for this directory.
The two rules most easily broken:

1. **Layering** — services never import FastAPI, never raise `HTTPException`.
2. **Never block the event loop** — SQLAlchemy, bcrypt and the push SDKs all
   block; wrap them in `run_blocking` or they stall every concurrent request.

## Security

Passwords are bcrypt-hashed and never logged. JWTs expire after 30 days and
travel in the `Authorization` header, never a URL. All queries go through the
ORM, so nothing is built by string formatting.

The alert path is the sensitive one: ownership, shared network and admin rights
are all verified server-side on every send, and a device whose heartbeat
reported a different WiFi MAC becomes `UNKNOWN` and can no longer be alerted.

## Deployment

See [`docs/DEPLOYMENT.md`](../docs/DEPLOYMENT.md). In production the API runs
behind Nginx with TLS; `/docs` and `/redoc` are disabled automatically when
`ENVIRONMENT=production`.
