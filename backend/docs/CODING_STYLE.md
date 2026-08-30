# Backend Coding Style

Binding rules for everything under `backend/src/`. The project-wide contract
(response envelope, error codes, correlation IDs) lives in
[`docs/CODING_STANDARDS.md`](../../docs/CODING_STANDARDS.md); this file covers
the Python- and FastAPI-specific decisions that sit on top of it.

---

## 1. Layering — the rule that keeps this codebase extensible

```
routes/      HTTP shape only. Parse, delegate, format. No business logic.
  ↓
services/    All domain rules. No FastAPI imports. No HTTP status codes.
  ↓
models/      Persistence only. No behaviour beyond __repr__ and relationships.
```

A route may call a service. A service may call another service and the models.
**Nothing calls upward.** If a service imports from `routes/`, the layering is
broken and the logic belongs in the service.

Why it matters: services stay testable without spinning up an HTTP client, and
a second transport (a CLI, a background worker, a gRPC endpoint) can reuse the
same domain code without touching a route.

Concretely, a route handler should be short enough to read at a glance:

```python
@router.post("/send")
async def send_alert(payload, user_id=Depends(get_current_user_id), db=Depends(get_db)):
    service = AlertService(db)
    alert_id = await run_blocking(service.send_alert, user_id, payload.device_ids)
    return success_response({"alert_id": alert_id}, message="Alert sent")
```

If a handler grows past roughly ten lines, logic has leaked out of the service.

---

## 2. Never block the event loop

Every handler is `async def`, so it runs on the single event-loop thread. One
synchronous wait stalls **every** concurrent request. With heartbeats arriving
from every device every 30 seconds, this is the fastest way to make the API
feel broken under trivial load.

Three things in this codebase block, and must always be offloaded via
`src.utils.concurrency.run_blocking`:

| Blocking call | Why it blocks |
|---|---|
| SQLAlchemy sync `Session` queries | Waits on the socket to PostgreSQL |
| `bcrypt` hash/verify | Deliberately slow CPU work, tens of ms per login |
| `firebase-admin` and APNs sends | Synchronous HTTP, up to `PUSH_TIMEOUT_SECONDS` |

```python
# Wrong — stalls every other in-flight request
device = service.get_device(device_id)

# Right
device = await run_blocking(service.get_device, device_id)
```

When fanning out push notifications to many devices, use `gather_with_limit`
rather than an unbounded `asyncio.gather` — one connection per device to the
push provider is not a shape that scales.

The alternative is migrating to `async` SQLAlchemy end-to-end. That is a
deliberate Phase 2 decision, not something to introduce file-by-file: a mix of
sync and async sessions is worse than either alone.

---

## 3. Dependency injection

Services take their collaborators as constructor arguments. They never build
them, and never reach for a module-level singleton.

```python
class AlertService:
    def __init__(self, db: Session, notifier: NotificationService) -> None:
        self._db = db
        self._notifier = notifier
```

This is what makes the push providers mockable in tests — `test_alerts.py`
passes a stub notifier and asserts on delivery status without touching the
network.

The same applies to configuration: import `settings` from `src.config`, never
read `os.environ` directly, so tests can substitute a `Settings` instance.

---

## 4. Type hints

Every parameter and every return type, with no exceptions. `mypy` runs with
`disallow_untyped_defs = true`, so an untyped function fails the check.

Prefer modern syntax: `list[Device]` over `List[Device]`, `str | None` over
`Optional[str]`.

Return domain types from services, not dicts. `get_device` returns a `Device`;
turning it into a response body is the route's job.

---

## 5. Errors

Raise domain exceptions from services; translate them at the route boundary.
A service must never import `HTTPException` — that would tie the domain to HTTP
and prevent reuse from any other transport.

| Service raises | Route returns |
|---|---|
| `LookupError` | 404 with `DEVICE_001` |
| `PermissionError` | 403 with `ALERT_003` or 401 with `AUTH_004` |
| `ValueError` | 400 with the relevant `VAL_*` |

Catch specific exceptions before generic ones, and always log with
`exc_info=True` — `logger.error(str(exc))` throws away the traceback, which is
the only part worth having at 3am.

Never let an internal detail reach the client. The global handler in `main.py`
converts anything unhandled into `SYS_001` with a generic message.

---

## 6. Logging

Get a logger per module with `get_logger("service_name")`. The correlation ID
is injected automatically from a `ContextVar`, so never thread it through as a
function argument just to log it.

Log business events at INFO (`Device registered: device_id=...`), handled
surprises at WARNING (a push retry, a device going offline), and failures at
ERROR with the traceback. Never log a password, a token, or a push token.

---

## 7. Size and naming

Functions under 20 lines, classes under 200. When a service method outgrows
that, extract a private helper — `_verify_alert_targets`, not a longer method.

Names spell things out: `user_id` not `uid`, `get_device_by_id` not `gd`.
Booleans read as assertions: `is_online`, `has_permission`.

Comments explain *why*. The code already says what it does; the comment earns
its place by recording the reason a reader would otherwise have to guess —
which is why `device.py` explains that a push token is not a stable identifier,
and `alert_log.py` explains why targets are an array rather than a join table.

---

## 8. Constants

Every magic number is a named constant in `src/utils/constants.py`. Derive
values rather than restating them:

```python
OFFLINE_THRESHOLD_SECONDS = HEARTBEAT_INTERVAL_SECONDS * HEARTBEAT_GRACE_MULTIPLIER
```

Changing the heartbeat cadence then updates the offline threshold automatically,
instead of leaving a second number silently wrong.

Constants shared with the frontend (`HEARTBEAT_INTERVAL_SECONDS`,
`DEFAULT_PAGE_SIZE`, `MAX_PAGE_SIZE`, the error codes) are marked in both files.
They must be changed together.

---

## 9. Database

UUID primary keys everywhere. Timestamps are `TIMESTAMP WITH TIME ZONE` in UTC.
Foreign keys cascade on delete, so removing a user removes their networks and
devices in one statement.

Index every column you filter on. `devices.user_id`, `devices.wifi_id`,
`wifi_networks.mac_address` and `users.email` are already indexed because every
hot query touches them.

Never build SQL with string formatting. The ORM parameterises for you; going
around it reintroduces injection.

Watch for N+1 queries: listing devices with their network in a loop issues one
query per row. Use `selectinload` when you need the relationship.

---

## 10. Testing

Group tests in classes by endpoint or behaviour, and name them as sentences:
`test_sets_status_unknown_when_wifi_mac_changed`.

Cover the failure paths, not just the happy one. The authorization tests in
`test_alerts.py` are the most valuable in the suite — they are what stops one
household beeping another's devices.

Mock Firebase and APNs always. A test that hits a real push provider is not a
test.

Target 70% coverage; `pyproject.toml` fails the run below that.
