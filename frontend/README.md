# BeepMyDevice — Frontend

React Native app in TypeScript. One codebase for iOS, Android, macOS and
Windows.

## Quick Start

```bash
cd frontend
npm install

cp .env.example .env
# Set API_BASE_URL. On a physical device, localhost points at the device
# itself — use your machine's LAN IP, e.g. http://192.168.1.20:8000

npm run ios          # or: npm run android
```

For iOS you also need the pods:

```bash
cd ios && pod install && cd ..
```

## Prerequisites

- Node.js 18+
- Xcode 15+ with an iOS 15+ simulator — iOS/macOS builds
- Android Studio with SDK 33+ — Android builds
- A running backend (see [`../backend/README.md`](../backend/README.md))

## Structure

```
src/
├── App.tsx          Root component; provider composition
├── types/           Shared types — several mirror the backend
├── screens/
│   ├── AuthStack/   Splash, Login, Register
│   └── AppStack/    Dashboard, DeviceDetail, Settings, Profile
├── components/      Presentational only
├── services/        API, WebSocket and push clients
├── hooks/           State and side effects — the only place useEffect appears
├── context/         Auth, Device and Error providers
├── navigation/      Root / Auth / App navigators
├── utils/           api-client, constants, storage, logger, helpers
└── styles/          theme, colors, spacing
```

Dependency direction: `screens/` → `hooks/` → `services/` → `api-client`. A
screen never imports axios. See [`docs/CODING_STYLE.md`](docs/CODING_STYLE.md).

## Technologies

| Concern | Choice |
|---|---|
| Framework | React Native 0.73 |
| Language | TypeScript 5.3, `strict` |
| Navigation | React Navigation v6 (native stack) |
| State | React Context API |
| HTTP | axios — one shared instance |
| Storage | AsyncStorage, behind a typed wrapper |
| Push | `@react-native-firebase/messaging`, `react-native-push-notification` |
| Device info | `react-native-device-info`, `react-native-network-info` |
| Tests | Jest + `@testing-library/react-native` |

## Environment Variables

| Variable | Purpose |
|---|---|
| `API_BASE_URL` | Backend origin |
| `WS_BASE_URL` | WebSocket origin — `wss://` in production |
| `API_TIMEOUT` | Request timeout in ms |
| `FIREBASE_CONFIG_ANDROID` | Client Firebase config (public) |
| `APPLE_TEAM_ID` | iOS configuration |
| `ENVIRONMENT`, `LOG_LEVEL`, `DEBUG_MODE` | App behaviour |
| `HEARTBEAT_INTERVAL_MS`, `ERROR_AUTO_CLOSE_MS` | Timings |

Everything here ships inside the app bundle and is readable by anyone who
downloads it. **Only client-safe values belong in this file.** The database
URL, JWT signing key, Firebase private key and APNs `.p8` live in
`backend/.env` and must never appear here.

## Screens

| Screen | Purpose |
|---|---|
| Splash | Restores the persisted session so a returning user skips login |
| Login / Register | Credentials; `VAL_*` errors highlight fields inline |
| **Dashboard** | The main screen — device list, live status, send alerts |
| DeviceDetail | OS version, last seen, battery, remove |
| Settings | Account, current WiFi network, device management, logout |
| Profile | Email and password change |

## Components

`DeviceCard` (one list row, alert button disabled unless `ONLINE`),
`StatusBadge` (colour *and* label), `BatteryIndicator` (hidden when null),
`ErrorAlert` (renders every error, auto-closes after 5s), `AlertModal`
(confirmation), `LoadingSpinner`.

## Services and Hooks

| Service | Responsibility |
|---|---|
| `api.ts` | Unwraps the envelope; callers never see `data.content` |
| `auth.ts` | Login, register, logout, token persistence |
| `device.ts` | Device CRUD, heartbeat, WiFi MAC and battery reads |
| `alert.ts` | Send alerts, read history |
| `notification.ts` | Permission, push token, playing the alert |
| `websocket.ts` | Live status with exponential-backoff reconnect |

| Hook | Responsibility |
|---|---|
| `useAuth` | Session state and actions |
| `useDevices` | Device list, updated in place from the socket |
| `useWebSocket` | Socket lifecycle for a screen |
| `useErrors` | Banner errors and per-field errors |
| `usePushNotifications` | Permission and token rotation |

## Testing

```bash
npm test
npm test -- hooks.test.ts
npm test -- --coverage
npm run typecheck
npm run lint
```

Coverage floor is 70%, enforced in `package.json`. The axios instance is mocked;
no test performs a real network call.

## Building

```bash
# Android
npm run build:android      # android/app/build/outputs/apk/release/

# iOS
npm run build:ios          # then archive and upload via Xcode
```

## Coding Standards

[`docs/CODING_STYLE.md`](docs/CODING_STYLE.md) is binding for this directory.
The rules most easily broken:

1. **One axios instance** — a second one, or a bare `fetch`, bypasses the
   interceptors and sends requests with no auth token and no correlation ID.
2. **Routes in constants** — every path comes from `API_ROUTES`.
3. **Render every error** in the array, not just the first.

## Platform Notes

The WiFi BSSID is treated as location data on both iOS and Android, so the app
needs location permission before it can identify the network at all. Denying it
is not a degraded mode — the app cannot function — so prompt clearly rather than
failing silently.
