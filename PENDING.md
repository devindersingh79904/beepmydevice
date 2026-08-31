# Pending work

Running hand-off list. Update it as items land; it is the file to read first
when picking the project back up.

Last updated: 2026-08-31, after Phase 1 implementation.

---

## Phase 1 status: implemented and verified

```
backend    59 tests · 80% coverage · mypy clean · pylint 9.98 · black
frontend  137 tests · coverage thresholds met · tsc clean · 0 lint errors
```

Both suites were run, not assumed. The API was also booted and served real
requests (`/health`, `/auth/register`, all ten routes in the OpenAPI schema).

### What works

- **Auth** — register, login, JWT issue/verify, logout via a revocation list.
  Login is timing-equalised so it cannot be used to discover which addresses
  are registered.
- **Devices** — owned and guest registration, network-scoped listing,
  heartbeat, removal. A heartbeat from a MAC other than the registered one sets
  `UNKNOWN`, and `UNKNOWN` devices are not alertable.
- **Guests** — `user_id` stays null, `is_guest` is derived, and the device
  token is scoped to one `device_id`. It cannot list, and at `/alerts/send` it
  gets `ALERT_005` (that code was documented but unreachable before).
- **Alerts** — the three authorization checks in order, all-or-nothing, with
  per-device push delivery reported separately.
- **Realtime** — the status WebSocket, with broadcasts aimed at the network's
  admin rather than every dashboard in the process.
- **Frontend** — all eleven canvas screens on real services, contexts and
  hooks; device self-registration and the 30-second heartbeat; the socket
  reconnecting with backoff.

### Defects found and fixed along the way

| Defect | Impact before the fix |
|---|---|
| `requirements.txt` was uninstallable — `firebase-admin` needs `pyjwt>=2.5`, `apns2` pins `PyJWT<2.0` | The backend could not be installed at all. APNs now goes over HTTP/2 via `httpx`, dropping `apns2` |
| `migrations/script.py.mako` missing | No migration could ever be generated |
| `migrations/env.py` was a stub | Migrations could not run |
| Login button used the auth context's `isLoading` | Disabled on first mount, before the user typed anything |
| `wifi_mac` had no format validation | Malformed MACs reached the trust boundary |
| Invalid `device_type` reported `VAL_002` | Contract says `DEVICE_003` |
| Dialog card was an unlabelled `Pressable` | Announced to screen readers as a button |

---

## What is *not* done

### 1. Icon fonts are not linked — the UI looks broken without this

`react-native-vector-icons` needs its fonts registered natively or **every icon
renders as a blank box**, silently.

- iOS: add `Feather.ttf` and `MaterialCommunityIcons.ttf` to `UIAppFonts` in
  `ios/BeepMyDevice/Info.plist`
- Android: apply `fonts.gradle` in `android/app/build.gradle`

This is the first thing to do before running the app on a device.

### 2. Never run on a real device or simulator

Everything is verified by test suite and by the API serving HTTP. No screen has
been rendered on iOS or Android hardware. Expect the usual first-run native
issues: pod install, Gradle, permissions prompts.

### 3. Push notifications are not configured

Deliberately deferred. `NotificationService` degrades cleanly — it logs what it
would have sent when credentials are absent — so alerts currently record and
report as delivered without a device actually ringing.

Needed to close it:
- A Firebase project; fill `FIREBASE_*` in `backend/.env` and add
  `google-services.json` / `GoogleService-Info.plist` to the app
- An APNs `.p8` key; fill `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_KEY_PATH`
- `frontend/assets/alert.mp3` — the alert sound is referenced but the file does
  not exist yet

### 4. Endpoints the UI expects that do not exist

- **Change password** — `ProfileScreen` renders the form and reports honestly
  that it cannot save. There is no route in `API_ROUTES`.
- **Alert history per device** — `DeviceDetailScreen` shows the canvas's empty
  state. `GET /alerts/logs` exists but is not per-device, and no hook consumes
  it.
- **Notification preferences** — the Settings toggles are local state and do
  not survive a restart.
- **Forgot password** — a placeholder link, exactly as in the canvas. No flow
  is designed.

### 5. Known Phase 2 limits, unchanged

- `WebSocketManager` and the token revocation set are in process memory, so the
  API must run **one worker**. Redis pub/sub lifts both.
- Sync SQLAlchemy behind `run_blocking`. A file-by-file async migration would
  be worse than either alone.
- No rate limiting.

### 6. Typography

Archivo is not bundled. `styles/typography.ts` falls back to the system font
behind a single `ARCHIVO_BUNDLED` flag. Drop
`Archivo-Regular/SemiBold/Bold.ttf` into `assets/fonts/`, run
`npx react-native-asset`, flip the flag.

### 7. Lint warnings

Eleven `max-lines-per-function` warnings on screen render bodies and the two
providers. The natural subcomponents are already extracted; what remains is JSX
composition, and splitting it further would create components that exist only
to satisfy the rule.

### 8. CI

Still staged in `.github/workflows.disabled/`. The old blockers are gone —
there is a `package-lock.json` and every check passes — but the backend job
needs a PostgreSQL service container the staged workflow does not define.

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
npm run ios   # or android — see the icon-font note above first
```

On Windows, `localhost` resolves to `::1` first, where a WSL relay can shadow
the port Docker published on `0.0.0.0`. The test suite pins itself to
`127.0.0.1` for that reason; if the API cannot reach the database, try the same.

---

## One design decision worth a second look

The canvas overrides the Modernist accent to blue and then uses that single
accent for *everything*: the primary button, the ONLINE badge, the guest badge,
and error text and the error banner. So errors are blue, not red. That is
faithful to the design as delivered, and it is what the code does.

If red errors are wanted, it is a two-line change in
`frontend/src/styles/colors.ts` (`error`, `errorText`) — but it breaks the
system's one-accent rule, so it is a design call, not a code one.
