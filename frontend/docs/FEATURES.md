# Frontend Features — Implementation Order

Phase 1 sliced into units small enough to implement and verify one at a time.
Each slice names the files it touches, what "done" means, and the cases worth
testing. Work them top to bottom.

Every slice inherits the same definition of done:

- `npm run typecheck` and `npm run lint` clean
- No `any`, explicit return types everywhere
- No magic numbers, no URL strings, no hex colours at call sites
- Every `useEffect` returns its cleanup
- Tests written, including the failure paths

The backend does not need to be finished first: slices 1–3 can be built against
the typed contracts in `src/types/`, which are already complete.

---

## 1. Foundations

**Files:** `utils/constants.ts`, `utils/logger.ts`, `utils/storage.ts`,
`styles/*`, `types/*`

Constants, theme and types are already written. `logger.ts` and `storage.ts`
need implementing — both are small and everything above depends on them.

Watch for: wrap every AsyncStorage read and write in try/catch. A storage
failure must degrade, not crash a screen.

---

## 2. The API client

**Files:** `utils/api-client.ts`, `services/api.ts`

One axios instance, two interceptors, envelope unwrapping.

Watch for: this is the slice that makes every later one correct. The request
interceptor attaches the Bearer token and `X-Correlation-ID`; the response
interceptor unwraps `data.content` and, on any `AUTH_*` code, clears the token
and signals a logout. Generate the correlation ID once per session, not per
request — the whole point is tracing a session.

**Tests:** the `api client` block in `__tests__/services.test.ts`.

---

## 3. Auth service and context

**Files:** `services/auth.ts`, `context/AuthContext.tsx`, `hooks/useAuth.ts`

Login, register, logout, session restore on mount.

Watch for: clear local state on logout **even if the network call fails** — the
user must end up signed out on this device regardless. `useAuth` throws outside
its provider, which is a feature: a clear message beats an undefined three
frames later.

**Tests:** the `useAuth` block in `__tests__/hooks.test.ts`.

---

## 4. Error handling

**Files:** `context/ErrorContext.tsx`, `hooks/useErrors.ts`,
`components/ErrorAlert.tsx`

Banner errors, per-field errors, auto-close after `ERROR_AUTO_CLOSE_MS`.

Watch for: render **every** entry in the array. A registration with a bad email
and a weak password must show both at once, or the user fixes one, resubmits,
and discovers the second. Clear the timer on unmount.

**Tests:** the `useErrors` and `ErrorAlert` blocks.

---

## 5. Auth screens and navigation

**Files:** `screens/AuthStack/*`, `navigation/*`, `App.tsx`

Splash, login, register, and the root navigator that swaps whole stacks on
`isAuthenticated`.

Watch for: swapping stacks rather than pushing a login screen means logout
cannot leave authenticated screens on the back stack. The splash screen exists
so a returning user never sees a flash of login.

Provider order in `App.tsx`: `ErrorProvider` outermost (so failures during
session restore have somewhere to render), `DeviceProvider` innermost (it needs
an authenticated user).

**Tests:** the `LoginScreen` block.

---

## 6. Device registration and permissions

**Files:** `services/device.ts`, `services/notification.ts`,
`hooks/usePushNotifications.ts`

Detect platform, request permissions, read the WiFi MAC and battery, register.

Watch for:

- The WiFi BSSID is location data on both platforms, so this needs location
  permission. Denial is not a degraded mode — the app cannot identify the
  network at all, so prompt clearly rather than failing silently.
- Registration works signed out. With no token the server returns a guest
  device and a `device_token`; persist that and use it for the heartbeat.
  Never send a user token you know to be expired — the server rejects it
  rather than making a guest, which is the behaviour you want.
- Notification denial is softer: the device still lists but cannot be alerted,
  and the UI must say so.
- Battery is null on desktops — render nothing, not `0%`.

**Tests:** the `device service` block.

---

## 7. Device list and the dashboard

**Files:** `hooks/useDevices.ts`, `context/DeviceContext.tsx`,
`components/DeviceCard.tsx`, `components/StatusBadge.tsx`,
`components/BatteryIndicator.tsx`, `screens/AppStack/DashboardScreen.tsx`

The main screen: every device on the network with live status and battery.

Watch for:

- The alert button is disabled unless the device is `ONLINE`, **and** for any
  guest. `OFFLINE` cannot receive the push; `UNKNOWN` has left the network; a
  guest can receive but never send.
- A greyed button always states its reason. Guests get helper text underneath
  ("Guests receive alerts but cannot send them"); offline and unknown devices
  are already explained by the status badge above. A disabled control with no
  explanation reads as a bug.
- Status and Guest are two badges shown together, never one replacing the
  other. A guest is still online, offline or unknown like anything else.
- Style guests neutrally (slate), never amber or red. A guest is a normal
  participant, not a problem to flag.
- Status pairs colour with a text label so it is not conveyed by colour alone.

**Tests:** the `DeviceCard` and `DashboardScreen` blocks.

---

## 8. Sending alerts

**Files:** `services/alert.ts`, `components/AlertModal.tsx`

Confirmation dialog, send, report the result.

Watch for: the response carries **per-device** delivery status. Show partial
success honestly — "3 of 4 devices alerted" — rather than collapsing it to a
single pass/fail. Empty `device_ids` targets the whole network.

**Tests:** the `alert service` block.

---

## 9. Live status over WebSocket

**Files:** `services/websocket.ts`, `hooks/useWebSocket.ts`

Connect, authenticate, apply updates in place, reconnect on drop.

Watch for: send the JWT as the first frame — the handshake cannot carry a
header. The socket **will** drop when a phone sleeps or changes network; that is
normal, so reconnect with exponential backoff and do not show an error. Apply
updates to the existing list rather than refetching. Stop after
`WS_MAX_RECONNECT_ATTEMPTS`.

**Tests:** the `websocket service` and `useDevices` blocks.

---

## 10. Heartbeat loop

**Files:** `hooks/useDevices.ts` or a dedicated hook

Send a heartbeat every `HEARTBEAT_INTERVAL_MS` with battery and current MAC.

Watch for: clear the interval on unmount. Re-read the MAC each time rather than
caching it — detecting a network change is the entire purpose of re-sending it.

---

## 11. Remaining screens

**Files:** `screens/AppStack/DeviceDetailScreen.tsx`, `SettingsScreen.tsx`,
`ProfileScreen.tsx`

Detail, settings, profile. Straightforward once the hooks exist.

---

## Working with an agent on these

One slice per session. Point it at the slice, the files, and
[`CODING_STYLE.md`](CODING_STYLE.md) — the `beepmydevice-frontend` skill loads
the rules automatically. Ask for tests in the same pass; the stub test names in
`__tests__/` already describe the cases worth having.

Restate the "watch for" notes in the prompt. They are the mistakes that are easy
to make and hard to notice — a dropped socket treated as an error, a null
battery rendered as `0%`, an `UNKNOWN` device left alertable.

Design reference for any screen work:
[`../../docs/BeepMyDevice_UI_UX_Design_Brief.md`](../../docs/BeepMyDevice_UI_UX_Design_Brief.md).
