---
name: beepmydevice-frontend
description: Use when writing, reviewing, redesigning or refactoring TypeScript code under frontend/ for the BeepMyDevice React Native app — screens, components, hooks, contexts, services or types. Enforces the layering, the single axios instance, routes-in-constants, strict typing, the error-display contract, and the "Modernist" design system that every screen is built from.
---

# BeepMyDevice Frontend

React Native 0.73 + TypeScript (strict), in `frontend/`. Targets iOS, Android,
macOS and Windows from one codebase.

## Before writing code

Read [`frontend/docs/CODING_STYLE.md`](../../../frontend/docs/CODING_STYLE.md).
It is the authority for this directory. For the cross-cutting API contract, read
[`docs/CODING_STANDARDS.md`](../../../docs/CODING_STANDARDS.md).

**Before touching any screen or component, read the design canvas.** It is the
authority for what the UI looks like, and it is checked in:

| File | What it is |
|---|---|
| `frontend/docs/design/Design decision/All Screens.dc.html` | Index — imports the app canvas once per screen, and is the list of the eleven screens that must exist |
| `frontend/docs/design/Design decision/BeepMyDevice.dc.html` | **The canvas.** Every screen's markup, copy and state logic |
| `frontend/docs/design/Design decision/_ds/modernist-*/styles.css` | The "Modernist" design system: tokens and component classes |
| `frontend/docs/design/all-screens.png` | Rendered reference for every screen |
| `frontend/docs/design/logo.png` | The brand mark, as exported |

Those files are the source; `frontend/src/styles/` is their translation into
React Native. When the two disagree, the canvas wins and the token file is
wrong.

The exports carry **stable names**, not the browser's `… (2).png` /
`… (3).png`. A new export overwrites the file of the same name, so there is
never a question of which one is current — git holds the previous version. Keep
it that way; the one time a numbered copy was left beside the current one, this
table pointed at the stale design.

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
never conveyed by colour alone. Every value comes from `styles/theme.ts`; if
the design needs a value that is not there, add it to the token file and use
the name — never inline the number.

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

**Guests** (`device.is_guest`) receive alerts but can never send them, so their
alert button is always disabled — with helper text saying why, since a greyed
control with no reason reads as a bug. Show the Guest badge *alongside* the
status badge, never instead of it: a guest is still online, offline or unknown.
Style it neutral slate, not amber or red — a guest is a normal participant.

## The design system

"Modernist", from the canvas. Four rules carry the whole look; breaking any one
makes a screen read as belonging to a different app.

**Monochrome plus one accent.** One neutral ramp (`neutral100`–`neutral900`)
and one accent ramp. The accent (a blue, `#006EDC`) carries the primary button,
the ONLINE badge, the guest badge, the toggle-on state, the error banner and
error text alike. Do **not** introduce a second hue — no green "online", no red
"error". If a state needs distinguishing, change weight, border or ink, not hue.

**Zero corner radius.** `radius.none` is the only radius. Avatars are squares,
badges are rectangles, toggles are square-tracked. This is why `Toggle` is a
custom control rather than the platform `Switch`, whose pill shape cannot be
squared off.

**Two border weights, and they mean different things.** `borderWidth.rule`
(2pt) separates *sections* — the header from the content, the footer from the
list. `borderWidth.hairline` (1pt) separates *rows and cards* within a section.
Using the wrong one destroys the visual hierarchy even though it still "looks
bordered".

**Type comes from `typography`, whole.** Spread a named style
(`{...typography.cardTitle}`); never assemble a size, weight and family at a
call site. The scale is in `styles/typography.ts` and maps 1:1 to the canvas.

### Where the code deviates from the canvas, and why

Keep this list short, and add to it only with a reason written down:

- **Inputs are 44pt, not 36pt.** 44 is the minimum touch target on both
  platforms; the canvas is a pointer-driven mock.
- **`UNKNOWN` status has no canvas design.** It renders heavier than OFFLINE
  (darker ink, solid border), staying inside the neutral ramp.
- **Battery has two tiers, not three.** The canvas colours only the low state;
  a "medium" colour would add information the design deliberately drops.
- **Archivo is not bundled.** `styles/typography.ts` resolves to the system
  font behind one flag until the font files land in `assets/fonts/`.

### Building a new screen

Compose from `components/` — never re-implement a header, badge or dialog:

`Screen` (safe area) › `ScreenHeader` (56pt bar, 2pt rule) › content ›
`ErrorAlert` as the first child of the content area so it overlays rather than
pushing the layout ›  `Toast` for transient outcomes › `ConfirmDialog` for
anything destructive. `AlertModal` is the one specialised dialog, because the
network line in it is the visible half of the WiFi trust boundary.

## Testing (Phase 1 is implemented)

```bash
cd frontend
npm test                # 137 tests
npm run test:coverage   # 70% thresholds, currently met
```

Every native module is mocked once in `jest.setup.js` — Config, AsyncStorage,
DeviceInfo, NetworkInfo, Firebase messaging, Sound, vector-icons. Add new ones
there rather than per-file, so a test that forgets one does not fail with an
unrelated error deep inside a library.

Two things worth knowing before writing a test here:

- **`Modal` renders its children twice** under the test renderer, so
  `getByRole` on anything inside a dialog throws "found multiple elements".
  Use `getAllBy*` and act on every match.
- **The api-client is tested through a stubbed axios adapter**, not by mocking
  axios. That keeps the real interceptors — the token header, the correlation
  ID, the envelope unwrapping, the AUTH_* teardown — under test.

## Patterns this codebase settled on

**`isLoading` from `useAuth` means "restoring a persisted session".** It is
true on first mount and is *not* a form's submitting state. A screen that
submits tracks its own `isSubmitting`; wiring the context flag to a button
leaves it disabled before the user has typed anything.

**Errors reach the banner through the context, not through try/catch at call
sites.** Services throw `ApiError[]`; contexts catch, check `isApiErrorArray`
and call `showErrors`. A screen only handles what it can act on inline.

**The api-client unwraps once.** The response interceptor returns `data`
(`content` + optional `pagination`) and throws `ApiError[]`. Nothing downstream
writes `response.data.data`, and nothing else creates an axios instance.

**WebSocket frames are partial.** A frame carries only what changed, so apply
it with `??` against the current value — treating a missing `status` as
`null` would blank out a device the user is looking at.
