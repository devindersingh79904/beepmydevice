# Pending work

Running hand-off list. Update it as items land; it is the file to read first
when picking the project back up.

Last updated: 2026-08-31, after the design-canvas implementation and the
toolchain verification pass.

---

## Done

**All eleven screens from the design canvas are implemented**, and the frontend
now typechecks and lints clean. The canvas is
`frontend/docs/design/Design decision/BeepMyDevice.dc.html`; the screen list is
`All Screens.dc.html`.

```
npm run typecheck   # 0 errors
npm run lint        # 0 errors, 8 warnings (see below)
npm test            # suites load; all 30 specs are unwritten placeholders
```

### The UI

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
- `frontend/src/utils/helpers.ts` and `frontend/src/hooks/useToast.ts` are
  implemented; both are pure/local, with no network.
- Docs: `.claude/skills/beepmydevice-frontend/SKILL.md` and
  `frontend/docs/CODING_STYLE.md` name the canvas as the design authority and
  spell out the system's rules and the deliberate deviations from it.

### Toolchain defects found and fixed

These were pre-existing and had never been caught, because `node_modules` had
never been installed. Each one blocked a build or a check outright:

| Problem | Fix |
|---|---|
| `babel-plugin-module-resolver` used by `babel.config.js` but absent from `package.json` — **Metro could not bundle the app at all**, and every Jest suite failed to load | added as a devDependency |
| `@types/*` path alias — TypeScript reserves that specifier for DefinitelyTyped and rejected all 25 imports through it with TS6137 | alias removed from `tsconfig.json` and `babel.config.js`; domain types now import as `@/types/...` |
| No `.prettierrc` — Prettier 3 fell back to its own defaults and `prettier/prettier` errored on nearly every line (857 errors) | added `frontend/.prettierrc.js` with the React Native template settings the codebase is actually written in |
| `eslint-plugin-jest` missing, so ESLint could not even start (`Environment key "jest/globals" is unknown`) | added as a devDependency |
| `eslint-plugin-prettier@4` (transitive) incompatible with the pinned Prettier 3 (`prettier.resolveConfig.sync is not a function`) | upgraded to `^5` |
| `react-native-vector-icons` ships no types (TS7016) | added `@types/react-native-vector-icons` |
| 35 unused declarations in the stub files, against `noUnusedLocals`/`noUnusedParameters` | stub parameters prefixed with `_` (the convention this repo's own ESLint `argsIgnorePattern` already encodes); two dead value imports trimmed |

`frontend/package-lock.json` is now committed, so these versions are pinned.

---

## Pending — next session

### 1. Link the icon fonts

`react-native-vector-icons` needs its native fonts registered or **every icon
in the app renders as a blank box**. Nothing in the JS will warn you.

- iOS: add `Feather.ttf` and `MaterialCommunityIcons.ttf` to
  `UIAppFonts` in `Info.plist`
- Android: apply `fonts.gradle` in `android/app/build.gradle`

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
  `DeviceProvider` innermost, and `SafeAreaProvider` must wrap the lot or every
  `Screen` loses its insets.

Two contract changes to honour:

- `UseDevicesResult` gained `networkName: string | null` (the dashboard header
  names the WiFi) and `removeDevice(deviceId)`.
- `hooks/useAlerts.ts` is new: `isSending`, `lastDelivery`, `sendAlert(ids)`.

When implementing a stub, drop the `_` prefix from the parameters as you start
using them.

### 3. Screen gaps that need a backend contract first

- **Alert history** on `DeviceDetailScreen` renders the canvas's empty state.
  It needs an alert-log hook over `getAlertLogs` before it can show rows.
- **Change password** on `ProfileScreen` renders the form but has no endpoint —
  there is no route for it in `API_ROUTES`. It reports that rather than
  pretending to save.
- **Notification preferences** in Settings are local component state; they need
  a preferences endpoint (or local persistence) to survive a restart.
- **Forgot password** is a placeholder link, exactly as in the canvas. No flow
  is designed yet.

### 4. Tests

All 30 specs in `__tests__/` are placeholders whose bodies throw
`Not implemented`, so the suite is red by design. The names describe what to
write. `package.json` sets a 70% coverage threshold.

Nothing currently covers the new UI. Worth writing first: `helpers.ts` (pure,
easy), the guest/offline disabled-button behaviour on `DeviceCard`, and
`ErrorAlert` rendering *every* error rather than the first.

### 5. Lint warnings

Eight `max-lines-per-function` warnings on screen render bodies. The natural
subcomponents are already extracted (`NetworkSummary`, `BatteryBlock`,
`Identity`, `GuestRow`, `StrengthMeter`); what remains is JSX composition, and
splitting it further would create components that exist only to satisfy the
rule. Left as warnings deliberately — revisit only if a screen grows again.

### 6. Typography

Archivo is not bundled. `frontend/assets/fonts/` is empty and
`styles/typography.ts` falls back to the system font behind a single
`ARCHIVO_BUNDLED` flag. To finish the look: add
`Archivo-Regular/SemiBold/Bold.ttf`, run `npx react-native-asset`, flip the
flag.

### 7. Backend

Untouched — still the full Phase 1 skeleton.

### 8. CI

Still disabled in `.github/workflows.disabled/`. The two things that blocked it
are now gone: there is a `package-lock.json`, and `typecheck`/`lint` pass. The
remaining blocker is `npm test`, which is red by design until item 4 is done.

---

## One design decision worth a second look

The canvas overrides the Modernist accent to blue and then uses that single
accent for *everything*: the primary button, the ONLINE badge, the guest badge,
and error text and the error banner. So errors are blue, not red. That is
faithful to the design as delivered, and it is what the code does.

If red errors are wanted, it is a two-line change in
`frontend/src/styles/colors.ts` (`error`, `errorText`) — but it breaks the
system's one-accent rule, so it is a design call, not a code one.
