# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

BeepMyDevice makes any device on a home WiFi ring, regardless of which account
it is signed in to. Apple Find My and Google Find My Device group devices by
**account**; this groups them by **network**. That one substitution is both the
product differentiator and the security model.

**The codebase is a skeleton.** Configuration, types, constants, contracts and
documentation are complete; every service method, route handler, hook and
component raises `NotImplementedError` / `throw new Error('Not implemented')`.
Implementation is Phase 1 work, 6–8 weeks. When filling in a stub, the docstring
above it states the intended behaviour — treat it as the specification.

## Commands

```bash
# Backend (from backend/)
uvicorn src.main:app --reload          # dev server, Swagger at /docs
pytest                                  # all tests
pytest tests/test_alerts.py::TestAlertAuthorization::test_name   # one test
pytest --cov=src --cov-report=term-missing
black src/ && pylint src/ && mypy src/
python -m alembic revision --autogenerate -m "msg" && python -m alembic upgrade head
cd docker && docker compose up --build  # API + PostgreSQL together

# Frontend (from frontend/)
npm start                               # Metro bundler
npm run ios | npm run android
npm test
npm test -- hooks.test.ts               # one file
npm test -- -t "auto-clears errors"     # one test
npm run typecheck && npm run lint
```

The backend refuses to start while `SECRET_KEY` is still the `.env.example`
placeholder — that is a deliberate guard, not a bug.

**CI is deliberately off.** The workflows are staged in
`.github/workflows.disabled/`, which GitHub ignores; they would fail today
because nothing is implemented and there is no `package-lock.json`. Do not move
them back into `.github/workflows/` unless asked. Run checks locally instead.

## Architecture

Two deployables, one repo. Both enforce a strict one-directional layering:

```
backend/    routes/ → services/ → models/      Python 3.11, FastAPI, SQLAlchemy 2.0, PostgreSQL
frontend/   screens/ → hooks/ → services/ → api-client    React Native 0.73, TypeScript strict
```

Nothing calls upward. Backend services import no FastAPI symbols and raise
domain exceptions (`LookupError`, `PermissionError`, `ValueError`) that routes
translate into error codes — that is what keeps the domain reusable and
testable without an HTTP client. On the frontend, a screen never imports axios.

Four tables, UUID PKs: `users` → `wifi_networks` → `devices`, plus `alert_logs`.
`wifi_networks.mac_address` is unique, so one router maps to one alert group.

Alerts go **out through FCM/APNs**, not over the local network. The server is a
cloud relay; there is no hub in the home. WiFi is an identity check, never a
transport.

## The rules that are easy to break

**The WiFi MAC is the trust boundary.** `AlertService.send_alert` runs three
checks in order — all targets share one `wifi_id`, the sender is that network's
admin, targets are reachable. Any failure aborts the whole request; there is no
partial delivery. A heartbeat reporting a different MAC sets status `UNKNOWN`,
not `ONLINE`, and `UNKNOWN` devices must not be alertable. Changes near this
path need matching cases in `tests/test_alerts.py::TestAlertAuthorization`.

Note the check that is deliberately absent: targets need **not** be owned by
the sender. Guest devices have no owner at all, so shared network membership
carries the whole boundary. Ownership is required only of the sender.

**Guests.** `devices.user_id` is nullable; null means a guest that
auto-registered with no account. A guest receives alerts, appears in the
admin's list badged "Guest", and can do nothing else — it holds a device token
scoped to one `device_id` that authorises only its own heartbeat, so it cannot
list devices or authenticate at the alert endpoint. `is_guest` is derived from
`user_id IS NULL`, never stored, so the two cannot disagree. The greyed alert
button in the UI is presentation; the real control is the missing user token.

**Never block the event loop.** Handlers are `async def`. SQLAlchemy sync
sessions, bcrypt and the push SDKs all block, and one blocking call stalls every
concurrent request — with every device heartbeating every 30 seconds, that is
not hypothetical. Wrap them in `src.utils.concurrency.run_blocking`; use
`gather_with_limit` for push fan-out.

**One response envelope.** Build every response via
`src.utils.responses.success_response` / `error_response`. `errors` is always an
array. Pagination goes under `data.pagination`.

**One axios instance.** `frontend/src/utils/api-client.ts`. A second instance or
a bare `fetch` bypasses the interceptors and sends requests with no auth token
and no correlation ID. Every path comes from `API_ROUTES` in
`utils/constants.ts` — no URL strings at call sites.

**Shared constants change in pairs.** `HEARTBEAT_INTERVAL_SECONDS` ↔
`HEARTBEAT_INTERVAL_MS`, page sizes, and the error-code vocabulary all exist on
both sides and are marked as such.

**Error codes are a public contract.** `AUTH_*`, `DEVICE_*`, `ALERT_*`, `VAL_*`,
plus `DB_001` / `PUSH_001` / `SYS_001`. Never renumber; append. The frontend
branches on the prefix: `AUTH_*` logs out, `VAL_*` highlights the field,
everything else is a banner that auto-closes after 5 seconds. Render every entry
in the array, not just the first.

**Correlation IDs.** One UUID per client session in `X-Correlation-ID`; the
backend binds it to a `ContextVar` so every log line carries it. Never pass one
as an argument just to log it.

## Known limits, already decided

`WebSocketManager` holds connections in process memory, so the API must run a
**single Uvicorn worker** until Redis pub/sub lands in Phase 2 — with multiple
workers, status silently stops updating for some users. Sync SQLAlchemy stays
until an end-to-end async migration; a file-by-file mix would be worse than
either alone.

## Documentation

`docs/README.md` is the index. `docs/ARCHITECTURE.md` covers design,
`docs/API.md` the endpoints and error table, `docs/CODING_STANDARDS.md` the
cross-cutting contract. Per-side rules live in `backend/docs/CODING_STYLE.md`
and `frontend/docs/CODING_STYLE.md`, wired into skills in `.claude/skills/`.
`docs/BeepMyDevice_UI_UX_Design_Brief.md` is the reference for building screens.

Where planning docs conflict with these, the working docs win. One resolved
conflict: `CODING_STANDARDS.md` §5 shows `pagination` beside `data`; every other
example nests it as `data.pagination`, which is what the code implements.

## Conventions

Python: type hints on every parameter and return (`mypy` runs with
`disallow_untyped_defs`), functions under 20 lines, classes under 200, no magic
numbers — constants in `src/utils/constants.py`. Services take dependencies as
constructor arguments.

TypeScript: `strict`, no `any` (ESLint error), explicit return types including
components. Constants in `utils/constants.ts`; styling only via `theme`.

Commits: `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`, `chore:`.
Branches: `feature/…`, `bugfix/…`, `docs/…`, `hotfix/…`. Default branch is
`master`.
