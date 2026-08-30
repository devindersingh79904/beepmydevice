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
