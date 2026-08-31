# Pending work

Running hand-off list. Update it as items land; it is the file to read first
when picking the project back up.

Last updated: 2026-08-31, after wiring Firebase for both platforms.

---

## Status

```
backend    97 tests · 81.6% coverage · mypy clean · pylint 10.00/10 · black
frontend  161 tests · coverage thresholds met · tsc clean · 0 lint errors
CI         off by design; workflows stay staged in .github/workflows.disabled/
```

Both suites were run, not assumed. The API was booted and served real requests.

**Android is ready to build and test.** iOS is staged but cannot be built from
Windows. One defect and one credential remain — both below.

---

## What is actually left in Phase 1

| # | Item | Blocked on |
|---|---|---|
| 1 | Backend Firebase service-account key | You — 2 minutes in the console |
| 2 | `AlertStatus.RECEIVED` is never set | Nothing; parked until push delivers |
| 3 | Run it on a real device | Item 1 |

Nothing else. Everything below this table is either done, or explicitly out of
Phase 1.

### 1. The service-account key — the last credential

`google-services.json` lets the **app receive**. It does nothing for **sending**:
the backend signs its own requests to FCM with a service-account key, and
without it `NotificationService` logs what it would have sent and returns a
transient failure.

Firebase → ⚙️ Project settings → **Service accounts → Generate new private
key**, then into `backend/.env`:

```
FIREBASE_PROJECT_ID=<project_id from the service-account JSON>
FIREBASE_PRIVATE_KEY_ID=…
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n…\n-----END PRIVATE KEY-----\n

FIREBASE_CLIENT_EMAIL=…
```

Keep the `
` escapes literal — the config layer converts them back. Confirm it
took:

```bash
cd backend
.venv/Scripts/python -c "from src.config import settings; print('firebase:', settings.firebase_enabled)"
```

This now reports `False` while the `.env` still holds the `your-project-id`
placeholders, rather than calling them configured and letting every push fail
at the provider instead.

### 2. `RECEIVED` is never set

Alert status is only ever `SENT` or `FAILED`, but `docs/FEATURES.md` lists
`SENT` / `RECEIVED` / `FAILED`. Closing it needs the alert row written *before*
the push, so `alert_id` can travel in the payload; a device-authenticated
acknowledgement endpoint; and the app calling it when a push arrives.

Parked deliberately: it is only meaningfully testable once push actually
delivers, and writing it blind is how the other three defects happened.

---

## Firebase — where each piece lives

| Piece | Status |
|---|---|
| `frontend/android/app/google-services.json` | **In place**, package `com.beepmydevice`, gitignored |
| `frontend/ios/BeepMyDevice/GoogleService-Info.plist` | **In place**, bundle `com.beepmydevice.app`, gitignored |
| Android Gradle: plugin 4.5.0, BoM 34.18.0, `minSdk 23` | Done |
| iOS: `[FIRApp configure]` in `AppDelegate.mm`, Podfile guard | Done |
| Backend service-account key | **Outstanding** — see above |
| APNs `.p8` key | Needs a paid Apple Developer account |

Example files are tracked beside each real one; the real ones never are. Full
walkthrough in **[`docs/PUSH_SETUP.md`](docs/PUSH_SETUP.md)**.

Two iOS steps cannot be done from Windows, and are not Android blockers:

- **Add the plist to the Xcode target.** Copying it into the folder does not put
  it in the app bundle, and `[FIRApp configure]` raises at launch when it cannot
  find it.
- **Enable the Push Notifications capability** in Signing & Capabilities.

Firebase's iOS page describes Swift Package Manager and a SwiftUI `@main struct
App`. None of it applies here — React Native autolinks Firebase through
CocoaPods and configures it from `AppDelegate.mm`, which is already done.

---

## Defects found by the audit, and what happened to them

An audit against `docs/FEATURES.md` found four behaviours that were specified,
had code written for them, and were never called. Three are fixed, each with a
test that creates the condition rather than asserting on a freshly-written
row — which is exactly why 82 green tests had missed all of them.

### Fixed: devices now go OFFLINE

Status is derived on every read from `last_heartbeat`, in one place
(`device_service.effective_status`), and applied to the list, the detail
endpoint and alert targeting. A whole-network alert bounds the heartbeat window
in SQL, so a device that stopped speaking is not a target. `UNKNOWN` is left
alone -- it describes *which network* a device is on, not how recently it spoke.

Tested by ageing a device past `OFFLINE_THRESHOLD_SECONDS`, which is exactly
what the old suite never did.

### Fixed: dead push tokens are cleared, transient failures retried

`PushOutcome` replaces the boolean a push used to return, because a boolean
cannot distinguish "the provider is having a bad minute" from "this token names
an app that no longer exists". Firebase's `UnregisteredError` and APNs' 410 /
`BadDeviceToken` mean the token is gone: it is cleared immediately and never
retried. Anything else is retried `PUSH_MAX_RETRIES` times with a widening gap.

### Still open: `RECEIVED` is never set

Item 2 in the table above.

---

## What landed in this pass

### Native projects

`frontend/ios/` and `frontend/android/` were **empty** — no Xcode project, no
Gradle files. Both were generated from the RN 0.73.2 template and configured:

- iOS bundle ID `com.beepmydevice.app`, Android `applicationId`
  `com.beepmydevice`. The APNs topic must match the iOS bundle ID exactly or
  delivery fails silently.
- `UIBackgroundModes: remote-notification` — without it an alert can never wake
  the app to ring at full volume.
- `NSLocationWhenInUseUsageDescription` written properly. It was empty, which
  both fails App Store review and shows the user a blank permission prompt —
  and the app cannot function without that permission, since the BSSID is the
  alert group's identity.
- Android permissions: fine location, WiFi state, `POST_NOTIFICATIONS`
  (required from Android 13, silently drops notifications without it), vibrate.
- Google Services Gradle plugin and the Firebase BoM.

### Fonts and assets

- **Icon fonts linked** into both projects. Without this every icon renders as
  a blank box and nothing in JS warns about it.
- **Archivo bundled.** Google publishes only a variable font, and React Native
  cannot vary weight from one, so static Regular/SemiBold/Bold instances were
  generated with `fonttools` and their name tables rewritten — the instancer
  leaves all three claiming to be SemiBold, which would make iOS resolve them to
  one face. `ARCHIVO_BUNDLED` is now on, and the explicit `fontWeight` was
  dropped from the composed styles because a bundled face carries its own
  weight and pairing both synthesises a second layer of bolding.
- **Alert sound** generated as `assets/sounds/alert.wav` — an alternating
  two-tone pattern, which reads as "come and find me" rather than as a
  notification — and placed in `res/raw` where react-native-sound looks.
- **New brand mark** extracted from `docs/design/logo.png` at 1x/2x/3x with a
  transparent ground, and wired into the splash and sign-in screens via a
  `Logo` component. The export's ground turned out to be exactly `#F3F2F2`, the
  design system's background, so tile and artwork share one colour and no edge
  shows between them.

### The four missing endpoints

| Endpoint | Note |
|---|---|
| `PUT /auth/change-password` | Requires the current password, so a stolen token cannot lock the owner out |
| `POST /auth/forgot-password` · `POST /auth/reset-password` | Single-use token, SHA-256 hashed, 1 hour expiry. Responds identically for unknown addresses |
| `GET` / `PUT /auth/preferences` | Partial updates only. **Enforced server-side** — a device whose owner disabled notifications is not pushed to |
| `GET /alerts/logs/device/{id}` | Scoped by network administration, so an admin can read a guest's history |

Plus `ForgotPasswordScreen`, and Settings/Profile/DeviceDetail wired to the real
endpoints instead of local state and placeholders.

---

## Not done, and not Phase 1

### Never run on a device or simulator

Everything is verified by test suite and by the API serving HTTP. **No screen
has been rendered on real hardware.** Android can be built now; expect ordinary
first-run friction on a freshly generated project — Gradle sync, SDK versions,
runtime permission prompts.

Push does not work on an emulator without Google Play services, so the alert
path needs two real phones on one WiFi to exercise properly.

### Windows and macOS are code-ready, not buildable

`detectDeviceType()` handles all four platforms and `package.json` carries
`run-macos` / `run-windows`, but only `ios/` and `android/` native projects
exist. The feature list claims four platforms; two of them cannot be built
today.

### Phase 2 limits, unchanged

- `WebSocketManager` and the token revocation set live in process memory, so the
  API must run **one worker**. Redis pub/sub lifts both.
- Sync SQLAlchemy behind `run_blocking`.
- No rate limiting.
- All workflows stay staged in `.github/workflows.disabled/` and are not to be
  enabled without being explicitly asked. They are kept current so enabling
  them is a one-line move when that day comes.

### Lint warnings

Fifteen `max-lines-per-function` warnings on screen render bodies and the two
providers. The natural subcomponents are already extracted; what remains is JSX
composition, and splitting it further would create components that exist only to
satisfy the rule.

---

## Running it

```bash
# Backend — Python 3.11 or 3.12 only; 3.13+ has no wheels for some pins
cd backend
python -m venv .venv && .venv/Scripts/activate
pip install -r requirements.txt
docker compose -f docker/docker-compose.yml up -d db
python -m alembic upgrade head
uvicorn src.main:app --reload --workers 1
pytest

# Frontend
cd frontend
npm install
npm test && npm run typecheck && npm run lint
npm run android      # buildable now; iOS needs macOS + Xcode
```

On Windows, `localhost` resolves to `::1` first, where a WSL relay can shadow
the port Docker published on `0.0.0.0`. The test suite pins itself to
`127.0.0.1` for that reason; if the API cannot reach the database, try the same.

---

## One design decision worth a second look

The canvas uses a single blue accent for *everything*: the primary button, the
ONLINE badge, the guest badge, and error text and the error banner. So errors
are blue, not red. That is faithful to the design as delivered, and it is what
the code does.

If red errors are wanted, it is a two-line change in
`frontend/src/styles/colors.ts` (`error`, `errorText`) — but it breaks the
system's one-accent rule, so it is a design call, not a code one.
