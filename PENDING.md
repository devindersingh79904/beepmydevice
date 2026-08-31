# Pending work

Running hand-off list. Update it as items land; it is the file to read first
when picking the project back up.

Last updated: 2026-08-31, after Phase 1 completion.

---

## Phase 1 is complete

```
backend    82 tests · 81% coverage · mypy clean · pylint 10.00/10 · black
frontend  161 tests · coverage thresholds met · tsc clean · 0 lint errors
CI         off by design; workflows stay staged in .github/workflows.disabled/
```

Both suites were run, not assumed. The API was booted and served real requests.

## The only thing outstanding

**Push credentials.** Firebase and APNs keys, and the two credential files they
come with. Every line of code around them is written and tested; without them
`NotificationService` logs what it *would* have sent, so alerts still authorize,
record and report — the target device just does not ring.

Full instructions: **[`docs/PUSH_SETUP.md`](docs/PUSH_SETUP.md)**.

Nothing else in Phase 1 is waiting on anything.

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

Everything is verified by test suite and by the API serving HTTP. No screen has
been rendered on real hardware. The native projects are freshly generated, so
expect the usual first-run friction: `pod install` on macOS, Gradle sync, SDK
versions. `npm run ios` needs macOS.

### App launcher icons

Still the React Native default. The brand mark is in `assets/images/`; turning
it into `mipmap-*` and `AppIcon.appiconset` sets is a small design task nobody
has asked for yet.

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
npm run android      # or ios, on macOS
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
