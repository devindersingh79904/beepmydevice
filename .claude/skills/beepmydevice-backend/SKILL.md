---
name: beepmydevice-backend
description: Use when writing, reviewing or refactoring Python code under backend/ for the BeepMyDevice FastAPI service — routes, services, models, schemas, middleware, migrations or tests. Enforces the layering, response envelope, error codes, correlation IDs and the never-block-the-event-loop rule.
---

# BeepMyDevice Backend

Python 3.11 + FastAPI + SQLAlchemy 2.0 + PostgreSQL, in `backend/`.

## Before writing code

Read [`backend/docs/CODING_STYLE.md`](../../../backend/docs/CODING_STYLE.md).
It is the authority for this directory. For the cross-cutting API contract, read
[`docs/CODING_STANDARDS.md`](../../../docs/CODING_STANDARDS.md).

## Commands

```bash
cd backend
uvicorn src.main:app --reload      # dev server, docs at /docs
pytest                             # all tests
pytest tests/test_alerts.py::TestAlertAuthorization::test_name   # one test
pytest --cov=src --cov-report=term-missing
black src/ && pylint src/ && mypy src/
python -m alembic revision --autogenerate -m "description"
python -m alembic upgrade head
```

## The rules that are easy to get wrong

**Layering.** `routes/` → `services/` → `models/`, never upward. A route parses,
delegates and formats; it holds no business logic. A service imports no FastAPI
symbols and raises domain exceptions (`LookupError`, `PermissionError`,
`ValueError`), never `HTTPException` — the route translates those into codes.

**Never block the event loop.** Handlers are `async def`. SQLAlchemy sync
sessions, bcrypt, and the Firebase/APNs SDKs all block, and one blocking call
stalls every concurrent request. Wrap them in
`src.utils.concurrency.run_blocking`. Use `gather_with_limit` when fanning out
push notifications rather than an unbounded `asyncio.gather`.

**The response envelope.** Build every response with
`src.utils.responses.success_response` / `error_response` — never return a raw
dict. `errors` is always an array. Pagination goes under `data.pagination`.

**Error codes.** Use the `ErrorCode` enum in `src/utils/constants.py`. Codes are
part of the public API contract; never renumber them.

**Correlation IDs.** Injected automatically from a `ContextVar` by
`get_logger`. Never pass one as a function argument just to log it.

**Constants.** No magic numbers — everything in `src/utils/constants.py`. Values
marked as shared with the frontend must be changed on both sides together.

**Type hints.** Every parameter and return. `mypy` runs with
`disallow_untyped_defs`.

## The security-critical path

`AlertService.send_alert` runs three checks in order — all targets share one
`wifi_id`, the sender is that network's admin, targets are reachable. Any
failure aborts the whole request; there is no partial delivery. A device whose
heartbeat reported a different WiFi MAC is `UNKNOWN` and must not be alertable.

Targets are deliberately **not** checked for ownership: guest devices
(`user_id IS NULL`) have no owner, and alerting them is the point of guest
access. Shared network membership carries the boundary; ownership is required
only of the sender, which is what makes a guest structurally unable to send —
it holds a device token scoped to one `device_id`, not a user token.

Changes anywhere near this path need matching cases in
`tests/test_alerts.py::TestAlertAuthorization`.

## Running it (Phase 1 is implemented)

```bash
cd backend
python -m venv .venv && .venv/Scripts/activate   # Windows; else .venv/bin/activate
pip install -r requirements.txt
docker compose -f docker/docker-compose.yml up -d db
python -m alembic upgrade head
uvicorn src.main:app --reload --workers 1
pytest --cov=src --cov-report=term-missing
```

**Python 3.11 or 3.12 only.** Several pins (`psycopg2-binary`, `pydantic`) have
no wheels for 3.13+ and fall back to building from source.

**`--workers 1` is not a shortcut.** `WebSocketManager` and the token
revocation set both live in process memory; a second worker silently breaks
status updates and logout for a fraction of requests.

The test suite needs a real PostgreSQL — `UUID` and `ARRAY` have no SQLite
equivalent, and the alert rules are exactly what you do not want to test
against a different database than production runs. It manages its own
`<db>_test` database and skips with an explanation when none is reachable.

## Patterns this codebase settled on

**One exception subclass per error code.** A service raises
`DifferentNetworksError` / `NotNetworkAdminError` / `NoReachableTargetsError`
(subclasses of `PermissionError` / `ValueError`, so the documented `Raises:`
still holds) and the route maps each to `ALERT_001` / `ALERT_003` / `ALERT_002`.
Never branch on an exception's message text.

**Each service owns the credential it issues.** `AuthService` issues user
tokens; `DeviceService` issues device tokens and both carry a `type` claim, so
a device token presented where a user token is required is rejected on the
claim rather than by luck. That claim is the whole mechanism behind "a guest
cannot send".

**Services flush, they never commit.** `get_db` owns the transaction boundary,
so a later failure in the same request still rolls back everything before it.

**Wrap every blocking call.** Routes are `async def`; `run_blocking` for
SQLAlchemy, bcrypt and push SDK calls, `gather_with_limit` for push fan-out.
A bare call in a handler stalls every concurrent request, and with a heartbeat
per device every 30 seconds that is not hypothetical.

**A broadcast needs an audience.** `WebSocketManager.broadcast_*` takes the
network admin's user ID. Omitting it sends to every connected dashboard in the
process, which means one household's device status reaching another's.
