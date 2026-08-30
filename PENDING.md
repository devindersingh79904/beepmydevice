# Pending work

Running hand-off list. Update it as items land; it is the file to read first
when picking the project back up.

Last updated: 2026-08-30, after the design-canvas implementation pass.

---

## Done

**All eleven screens from the design canvas are implemented**, together with
the component library and the design tokens they are built from. The canvas is
`frontend/docs/design/Design decision/BeepMyDevice.dc.html`; the screen list is
`All Screens.dc.html`.

- `frontend/src/styles/` — `colors.ts`, `spacing.ts`, `typography.ts`,
  `theme.ts`. The "Modernist" system: one neutral ramp plus one blue accent,
  zero corner radius, 2pt section rules and 1pt row rules.
- `frontend/src/components/` — `Screen`, `ScreenHeader`, `Button`, `TextField`,
  `Toggle`, `Icon`, `Avatar`, `Rule`, `SectionLabel`, `SettingsSectionHeader`,
  `SettingsRow`, `StatusBadge`, `GuestBadge`, `BatteryIndicator`, `DeviceCard`,
  `ConfirmDialog`, `AlertModal`, `ErrorAlert`, `Toast`, `SkeletonCard`,
  `EmptyState`, `LoadingSpinner`, plus an `index.ts` barrel.
- `frontend/src/screens/` — Splash, Login, Register, Dashboard, DeviceDetail
  (owned and guest), Settings, Profile. Loading, empty and error states
  included.
- `frontend/src/navigation/` — `AuthNavigator`, `AppNavigator`,
  `RootNavigator`.
- `frontend/src/utils/helpers.ts` — implemented (pure functions only).
- `frontend/src/hooks/useToast.ts` — implemented (local state, no network).
- Docs: `.claude/skills/beepmydevice-frontend/SKILL.md` and
  `frontend/docs/CODING_STYLE.md` now point at the canvas as the design
  authority and spell out the system's rules and the four deliberate
  deviations from it.

---

## Pending — next session

### 1. Verify the frontend build (do this first)

`frontend/node_modules/` is not installed, so **nothing written in this pass
has been typechecked or linted**. This is the first thing to do:

```bash
cd frontend
npm install
npm run typecheck
npm run lint
```

Expect small fixes: import paths, unused imports, and `max-lines-per-function`
warnings on the larger screens.

Two things to confirm while there:

- `react-native-vector-icons` needs its native fonts linked (`Feather` and
  `MaterialCommunityIcons`) or every `Icon` renders blank.
- `react-native-safe-area-context` needs `SafeAreaProvider` at the root — it
  goes in `App.tsx`, which is still a stub (see below).

### 2. Hooks, contexts and services — the Phase 1 wiring

Screens are complete and bound to hook contracts, but the hooks still
`throw new Error('Not implemented')`, so the app cannot run end to end yet.
Outstanding:

- `context/AuthContext.tsx`, `context/DeviceContext.tsx`,
  `context/ErrorContext.tsx`
- `hooks/useAuth.ts`, `hooks/useDevices.ts`, `hooks/useErrors.ts`,
  `hooks/useAlerts.ts`, `hooks/useWebSocket.ts`, `hooks/usePushNotifications.ts`
- `services/api.ts`, `auth.ts`, `device.ts`, `alert.ts`, `notification.ts`,
  `websocket.ts`
- `utils/api-client.ts`, `storage.ts`, `logger.ts`
- `App.tsx` — provider wiring. Order matters: `ErrorProvider` outermost,
  `DeviceProvider` innermost, with `SafeAreaProvider` around the lot.

Two contract changes this pass made, which the implementations must honour:

- `UseDevicesResult` gained `networkName: string | null` (the dashboard header
  names the WiFi) and `removeDevice(deviceId)`.
- `hooks/useAlerts.ts` is new: `isSending`, `lastDelivery`, `sendAlert(ids)`.

### 3. Screen gaps that need a backend contract first

- **Alert history** on `DeviceDetailScreen` renders the canvas's empty state.
  It needs an alert-log hook over `getAlertLogs` before it can show rows.
- **Change password** on `ProfileScreen` renders the form but has no endpoint —
  there is no route for it in `API_ROUTES`. It currently reports that instead of
  pretending to save.
- **Notification preferences** in Settings are local component state; they need
  a preferences endpoint (or local persistence) to survive a restart.
- **Forgot password** is a placeholder link, exactly as in the canvas. No flow
  is designed yet.

### 4. Typography

Archivo is not bundled. `frontend/assets/fonts/` is empty and
`styles/typography.ts` falls back to the system font behind a single
`ARCHIVO_BUNDLED` flag. To finish the look: add
`Archivo-Regular/SemiBold/Bold.ttf`, run `npx react-native-asset`, flip the
flag.

### 5. Tests

No tests were written for the new components. `package.json` sets a 70%
coverage threshold. Worth covering first: `helpers.ts` (pure, easy),
`canSendAlertTo` and the guest/offline disabled-button behaviour on
`DeviceCard`, and `ErrorAlert` rendering *every* error rather than the first.

### 6. Backend

Untouched this pass — still the full Phase 1 skeleton.

### 7. CI

Still deliberately disabled in `.github/workflows.disabled/`. Leave it there
until the above is implemented and there is a `package-lock.json`.

---

## One design decision worth a second look

The canvas overrides the Modernist accent to blue and then uses that single
accent for *everything*: the primary button, the ONLINE badge, the guest badge,
and error text and the error banner. So errors are blue, not red. That is
faithful to the design as delivered, and it is what the code does.

If red errors are wanted, it is a two-line change in
`frontend/src/styles/colors.ts` (`error`, `errorText`) — but it does break the
system's one-accent rule, so it is a design call, not a code one.
