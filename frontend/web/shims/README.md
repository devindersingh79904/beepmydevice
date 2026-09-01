# Web shims

Substitutes for the native modules the app imports, used only by the
`frontend/web` Vite build. Each one stands in for a package with no browser
implementation.

| Shim | Stands in for | What is lost |
|---|---|---|
| `network-info.ts` | `react-native-network-info` | **Everything that matters.** `getBSSID()` returns null — no browser exposes it |
| `firebase-messaging.ts` | `@react-native-firebase/messaging` | Push. `getToken()` returns `''` |
| `firebase-app.ts` | `@react-native-firebase/app` | Nothing; only satisfies the import |
| `sound.ts` | `react-native-sound` | Backed by `Audio`, but subject to the autoplay policy and cannot override a silent switch |
| `push-notification.ts` | `react-native-push-notification` | Local notifications and channels |
| `device-info.ts` | `react-native-device-info` | Device name is the browser; battery is Chromium-only |
| `react-native-config.ts` | `react-native-config` | Nothing; reads `import.meta.env` instead of `.env` |

## The thing to understand before using this build

**A browser cannot read the WiFi BSSID, and the BSSID is the security model.**

`AlertService.send_alert` authorizes on shared `wifi_id`: devices on one router
are one alert group, and being in that group is the entire permission to be
alerted. There is no browser API that returns a BSSID — not behind a
permission prompt, not on HTTPS, not with a flag. The Network Information API
reports connection *quality* and deliberately nothing identifying.

So this build:

- **can** sign in, list devices, send alerts, read history, change settings —
  everything that goes through the REST API
- **cannot** register itself as a device, and cannot be alerted

That is not a missing feature; it is the platform. `useDeviceRegistration`
declines to register when the BSSID or the push token is missing, so the app
runs as a signed-in browsing client rather than as a device.

The three tempting shortcuts are all worse than null:

- a **hard-coded MAC** registers this browser onto a network it is not on —
  the exact boundary the product exists to enforce
- a **random MAC** creates a fresh single-member network on every page load
- a **fake push token** produces a device row that shows as alertable in every
  admin's list and silently fails every time

## Which browser build should I use?

For an admin interface, use **`web/`** — the dashboard. It is built for a
browser rather than adapted to one, and it does everything a browser can
usefully do here.

This build exists to render the mobile screens on a desktop: reviewing the UI
without a device attached, and screenshotting for design work.

## Adding a shim

1. Add the file here with a doc comment saying what it replaces and what is
   lost.
2. Add an alias in `frontend/web/vite.config.ts`. Order matters — Vite matches
   in sequence, so put a longer specifier (`@scope/pkg/sub`) before the
   shorter one that would also match it.
3. Add a row to the table above.

Never make a shim return a plausible-looking fake value. A shim that fails
loudly is debuggable; one that lies is not.
