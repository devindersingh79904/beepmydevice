# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

BeepMyDevice makes any device on a home WiFi ring, regardless of which account
it is signed in to. Apple Find My and Google Find My Device group devices by
**account**; this groups them by **network**. That one substitution is both the
product differentiator and the security model.

**Phase 1 is all but complete.** The backend serves sixteen HTTP endpoints plus
the status WebSocket; the frontend has every screen from the design canvas
wired to real services, contexts and hooks, with both native projects generated
and configured. Backend: 98 tests, ~81% coverage, `mypy` clean, `pylint` 10.00.
Frontend: 161 tests, coverage thresholds met, `tsc` and `eslint` clean.

Two things remain, both tracked in [`PENDING.md`](PENDING.md): the backend
Firebase **service-account key**, without which `NotificationService` only logs
what it would have sent (see [`docs/PUSH_SETUP.md`](docs/PUSH_SETUP.md)); and
`AlertStatus.RECEIVED`, which is never set because there is no acknowledgement
endpoint yet.

Nothing here has been run on a phone. Both suites pass and the API serves HTTP,
which is not the same claim.

Docstrings are still the specification — where one describes behaviour, the
code is expected to match it, and a change to either should change both.

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
npm run web                             # the app itself on web, port 19006
npm test
npm test -- hooks.test.ts               # one file
npm test -- -t "auto-clears errors"     # one test
npm run typecheck && npm run lint

# Web dashboard (from web/)
npm run dev                             # port 3000, proxies /api and /ws to :8000
npm test && npm run typecheck && npm run lint
npm run build                           # typechecks, then bundles
docker build -t beepmydevice-web .      # its own Dockerfile; nginx serves dist/
```

The backend refuses to start while `SECRET_KEY` is still the `.env.example`
placeholder — that is a deliberate guard, not a bug.

Use **Python 3.11 or 3.12**; several pins have no wheels for 3.13+. The test
suite needs PostgreSQL: `docker compose -f docker/docker-compose.yml up -d db`.
Run the API with `--workers 1` (see the WebSocket note below).

**CI is deliberately off.** All three workflows are staged in
`.github/workflows.disabled/`, which GitHub ignores. They are kept current --
`backend-tests.yml` has its PostgreSQL service and an `alembic upgrade head`
step -- but they do not run. **Do not move them into `.github/workflows/`
unless explicitly asked**, and treat a task list that merely mentions "CI" as
not being that ask.

## Architecture

Three deployables, one repo. All enforce a strict one-directional layering:

```
backend/    routes/ → services/ → models/      Python 3.11, FastAPI, SQLAlchemy 2.0, PostgreSQL
frontend/   screens/ → hooks/ → services/ → api-client    React Native 0.73, TypeScript strict
web/        pages/ → hooks+contexts/ → services/ → api-client   React 18 + Vite, TypeScript strict
```

`web/` is the admin dashboard, built from
`frontend/docs/design/web/Web Dashboard.dc.html`. It speaks the same sixteen
endpoints and reuses none of the mobile code: a React Native bundle and a Vite
bundle cannot share modules without dragging Metro's resolution into the web
build. What must not diverge is guarded instead — `web/src/styles/tokens.test.ts`
fails if the palette drifts from `frontend/src/styles/colors.ts`.

`frontend/` also builds for the browser (`npm run web`, port 19006) via
react-native-web and the shims in `frontend/web/shims/`. **That build cannot
register a device or receive an alert** — no browser exposes a WiFi BSSID, and
the BSSID is the alert group's identity. It is for reviewing the mobile screens
on a desktop, not for use. The dashboard is the supported browser experience.

Nothing calls upward. Backend services import no FastAPI symbols and raise
domain exceptions (`LookupError`, `PermissionError`, `ValueError`) that routes
translate into error codes — that is what keeps the domain reusable and
testable without an HTTP client. On the frontend, a screen never imports axios.

Five tables, UUID PKs: `users` → `wifi_networks` → `devices`, plus `alert_logs`
and `discovered_devices`. `wifi_networks.mac_address` is unique, so one router
maps to one alert group.

**A `discovered_device` is not a `Device`.** It is something a phone reported
seeing on the network — a TV, a printer, a router — with no push token, no
status, and no way to be alerted. The two are separate tables so that a Send
alert button can never appear over a printer.

Alerts go **out through FCM/APNs**, not over the local network. The server is a
cloud relay; there is no hub in the home. WiFi is an identity check, never a
transport.

**The server cannot see the home network, and this catches people out.** WiFi
discovery therefore runs on the *phone* — `frontend/src/services/discovery.ts`
— which posts what it found to `POST /devices/scan`. An `arp-scan` or subnet
sweep written into the backend enumerates the hosting provider's datacenter,
returns other tenants' machines, and never sees a single device of the user's.
If a task describes scanning from the backend, that is the thing to fix in it
before anything else.

Discovery is also partial by nature, and the UI must not claim otherwise: mDNS
finds only what advertises (TVs, printers, speakers, cast targets) and the
sweep finds only what answers on a port. Neither sees a phone or a laptop.

## The rules that are easy to break

**The WiFi MAC is the trust boundary.** `AlertService.send_alert` runs three
checks in order — all targets share one `wifi_id`, the sender is that network's
admin, no target has left the network. Any failure aborts the whole request;
there is no partial delivery. A heartbeat reporting a different MAC sets status
`UNKNOWN`, not `ONLINE`, and `UNKNOWN` devices must not be alertable. Changes
near this path need matching cases in
`tests/test_alerts.py::TestAlertAuthorization`.

`UNKNOWN` is the *only* status that blocks an alert. `OFFLINE` does not:
alerts travel through FCM and APNs, which deliver to a phone that is asleep,
locked, or has not opened the app in a week, and every phone stops heartbeating
within `OFFLINE_THRESHOLD_SECONDS` of being put down. Requiring `ONLINE` meant
a device could only be beeped while somebody was already holding it — the one
case where nobody needs to. Liveness and membership are different questions and
only membership is a security one. `is_alertable` is mirrored in
`web/src/services/device.service.ts` and `frontend/src/utils/helpers.ts`; all
three change together.

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

**One axios instance per app.** `frontend/src/utils/api-client.ts` and
`web/src/utils/api-client.ts` are deliberate mirrors, differing only in where
the token is stored and where configuration comes from.

Within either app there is exactly one. A second instance or a bare `fetch`
bypasses the interceptors and sends requests with no auth token and no
correlation ID. Every path comes from `API_ROUTES` in `utils/constants.ts` —
no URL strings at call sites.

**The design system must not fork.** The palette exists twice — as CSS custom
properties in `web/src/styles/tokens.css` and as a TypeScript object in
`frontend/src/styles/colors.ts`, because React Native has no `oklch()` and no
stylesheet to read variables from. `web/src/styles/tokens.test.ts` reads the
mobile file and fails the build if any shared value differs. Zero corner radius
is part of that contract, not a preference.

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
`frontend/docs/design/` holds the design canvas, which is the authority for
what every screen looks like — read it before changing one.

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
