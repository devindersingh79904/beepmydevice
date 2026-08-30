---
name: beepmydevice-frontend
description: Use when writing, reviewing or refactoring TypeScript code under frontend/ for the BeepMyDevice React Native app — screens, components, hooks, contexts, services or types. Enforces the layering, the single axios instance, routes-in-constants, strict typing and the error-display contract.
---

# BeepMyDevice Frontend

React Native 0.73 + TypeScript (strict), in `frontend/`. Targets iOS, Android,
macOS and Windows from one codebase.

## Before writing code

Read [`frontend/docs/CODING_STYLE.md`](../../../frontend/docs/CODING_STYLE.md).
It is the authority for this directory. For the cross-cutting API contract, read
[`docs/CODING_STANDARDS.md`](../../../docs/CODING_STANDARDS.md).

## Commands

```bash
cd frontend
npm start                          # Metro bundler
npm run ios | npm run android
npm test
npm test -- hooks.test.ts          # one file
npm run typecheck                  # tsc --noEmit
npm run lint
```

## The rules that are easy to get wrong

**Layering.** `screens/` → `hooks/` → `services/` → `utils/api-client.ts`. A
screen never imports axios and never calls a service directly. Components are
presentational — a component that fetches is a screen wearing the wrong name.

**One axios instance.** `utils/api-client.ts` exports it; everything goes
through it. A second instance or a bare `fetch` bypasses both interceptors and
produces requests with no auth token and no correlation ID.

**Routes in constants.** Every path comes from `API_ROUTES` in
`utils/constants.ts`. Parameterised routes are typed functions, so a missing
argument is a compile error rather than a request to `/devices/undefined`.

**No magic numbers.** `no-magic-numbers` is an ESLint error. Timings,
thresholds and storage keys all live in `utils/constants.ts`. Values shared with
the backend (`HEARTBEAT_INTERVAL_MS`, page sizes, error codes) change on both
sides together.

**Strict TypeScript.** No `any` — use `unknown` and narrow. Explicit return
types everywhere, including components (`React.JSX.Element`). Model states as
unions so adding one breaks every unhandled `switch`.

**Theme only.** No hex values or raw pixel numbers in components. Status is
never conveyed by colour alone.

## The error-display contract

Services throw `ApiError[]`. Render **every** entry, not just the first.

| Prefix | Treatment |
|---|---|
| `AUTH_*` | Clear the session, return to login |
| `VAL_*` | Highlight the named field inline |
| everything else | Banner, auto-dismissing after `ERROR_AUTO_CLOSE_MS` (5s) |

## Conditions that are normal, not exceptional

The socket will drop — reconnect with backoff, silently. Location permission may
be denied, and the WiFi BSSID is location data on both platforms, so
`getWifiMacAddress` returns null and the app cannot function until it is
granted: prompt, do not fail silently. Notification permission may be denied —
the device still lists but cannot be alerted, and the UI must say so. Push
tokens rotate — re-register or alerts stop arriving with no visible symptom.
Battery may be null on desktops — render nothing, not `0%`.

Only an `ONLINE` device may be alerted. `OFFLINE` cannot receive the push;
`UNKNOWN` has left the network.
