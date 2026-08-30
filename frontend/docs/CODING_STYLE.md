# Frontend Coding Style

Binding rules for everything under `frontend/src/`. The project-wide contract
(response envelope, error codes, correlation IDs) lives in
[`docs/CODING_STANDARDS.md`](../../docs/CODING_STANDARDS.md); this file covers
the React Native and TypeScript decisions on top of it.

---

## 1. Layering

```
screens/      Compose components. Own navigation. No direct API calls.
  ↓
hooks/        State and side effects. The only place useEffect appears.
  ↓
services/     API calls. Return typed domain objects.
  ↓
utils/api-client.ts   The single axios instance. Nothing else creates one.
```

A screen never imports `axios`, and never calls a service directly — it uses a
hook. This is what keeps a screen renderable in a test without a network mock,
and what stops the same fetch being reimplemented on three screens.

Components are presentational: they take props and render. A component that
fetches is a screen wearing the wrong name.

---

## 2. One axios instance, one place

`utils/api-client.ts` exports exactly one configured instance. Every request in
the app goes through it. Creating a second instance, or calling `fetch`
directly, silently bypasses both interceptors and produces requests with no
auth token and no correlation ID.

The interceptors carry everything cross-cutting:

- **Request** — attaches `Authorization: Bearer …` and `X-Correlation-ID`.
- **Response** — unwraps `data.content`, and on any `AUTH_*` code clears the
  stored token and signals a logout, so an expired session can never leave the
  app half-authenticated.

Because unwrapping happens once here, no call site ever writes
`response.data.data.content`.

---

## 3. Routes live in constants

Every path is in `API_ROUTES` in `utils/constants.ts`. No URL string is ever
written at a call site.

```typescript
// Wrong
await get(`/devices/${deviceId}`);

// Right
await get(API_ROUTES.DEVICE_DETAIL(deviceId));
```

Parameterised routes are typed functions, so a missing argument is a compile
error rather than a request to `/devices/undefined`.

---

## 4. TypeScript

`strict` is on, plus `noUnusedLocals`, `noImplicitReturns` and
`noUnusedParameters`. `any` is an ESLint error — use `unknown` and narrow it.

Every function has an explicit return type, including components
(`React.JSX.Element`). Inference is fine inside a function; the signature is the
contract and must be written down.

Types that mirror the backend live in `types/` and say so in a comment.
`DeviceStatus`, `DeviceType` and the error codes have counterparts in
`backend/src/utils/constants.py` and must be changed together.

Model states as unions, not booleans. `DeviceStatus` is
`'ONLINE' | 'OFFLINE' | 'UNKNOWN'`, so adding a fourth state makes every
`switch` fail to compile until it is handled — which is exactly what you want.

---

## 5. Constants

No magic numbers: `no-magic-numbers` is an ESLint error. Everything lives in
`utils/constants.ts`, including storage keys, timings, and thresholds.

Values shared with the backend are marked. `HEARTBEAT_INTERVAL_MS` must match
`HEARTBEAT_INTERVAL_SECONDS`; `DEFAULT_PAGE_SIZE` and `MAX_PAGE_SIZE` must match
their Python counterparts.

Storage keys are namespaced (`@beepmydevice/auth_token`) so this app's keys can
never collide with a library's.

---

## 6. Styling

Import `theme` from `styles/theme.ts`. No component contains a hex value or a
raw pixel number — spacing comes from the 4pt scale, colour from the palette.

Status is never conveyed by colour alone. `StatusBadge` pairs its colour with a
text label, so the dashboard stays readable for colour-blind users.

---

## 7. Errors

Services throw `ApiError[]`. Screens do not catch them individually — the error
context renders them.

The prefix decides the treatment:

| Prefix | Treatment |
|---|---|
| `AUTH_*` | Clear the session and return to login |
| `VAL_*` | Highlight the named field inline |
| everything else | Banner, auto-dismissing after `ERROR_AUTO_CLOSE_MS` |

Render every entry in the array, not just the first. A registration with a bad
email *and* a weak password must show both at once — otherwise the user fixes
one, resubmits, and discovers the second.

---

## 8. Hooks

`useEffect` appears in hooks, not in screens. Every effect returns its cleanup:
an uncancelled heartbeat timer or an unclosed socket outlives the screen and
leaks.

Context hooks throw when used outside their provider. A clear
"useAuth must be used within an AuthProvider" beats a confusing undefined three
frames later.

---

## 9. Real-world conditions

The app runs on phones that change networks, sleep, and lose permissions. Treat
these as normal, not exceptional:

- **The socket will drop.** Reconnect with exponential backoff. Do not show the
  user an error for a routine reconnect.
- **Location permission may be denied.** The WiFi BSSID is location data on both
  platforms. `getWifiMacAddress` returns null; surface a setup prompt rather
  than failing silently — without it the app cannot work at all.
- **Notification permission may be denied.** The device still registers and
  appears on the dashboard, but cannot be alerted, and the UI must say so.
- **Push tokens rotate.** Re-register on refresh or alerts stop arriving with
  no visible symptom.
- **Battery may be null.** Desktops do not report one. Render nothing, not `0%`.

---

## 10. Testing

Test behaviour through the rendered output, not implementation details.
`@testing-library/react-native` queries by what the user sees.

Mock the axios instance, never the network. The highest-value cases are the
guard rails: that an OFFLINE or UNKNOWN device cannot be alerted, and that every
error in the array is rendered.

Target 70% coverage; `package.json` enforces it.
