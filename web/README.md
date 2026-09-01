# BeepMyDevice — web dashboard

The admin interface: manage the devices on your network, send alerts, read the
history. Built from `frontend/docs/design/web/Web Dashboard.dc.html`, which is
the authority for what every screen looks like — read it before changing one.

React 18 + TypeScript (strict) + Vite. No framework beyond React Router: every
screen sits behind a bearer token, so there is nothing for a server to render
that the client would not immediately re-fetch.

## Running it

```bash
# The API has to be up first (from backend/)
docker compose -f docker/docker-compose.yml up -d db
uvicorn src.main:app --reload --workers 1

# Then, from web/
cp .env.example .env      # optional — see below
npm install
npm run dev               # http://localhost:3000
```

`npm run dev` proxies `/api` and `/ws` to `127.0.0.1:8000`, so the browser sees
one origin: no CORS preflight, and a WebSocket that inherits the page's scheme.

**`.env` is optional.** Every variable has a working default in
`src/config/env.ts`, and the dashboard runs with none of them set. What it
resolved to is logged once at boot — check the console first when it is talking
to the wrong API.

```bash
npm run build       # typechecks, then bundles to dist/
npm test            # vitest
npm run typecheck
npm run lint
```

## In Docker

```bash
docker build -t beepmydevice-web .
docker run -p 8080:80 beepmydevice-web
```

Or with the API and database together, from `backend/`:

```bash
docker compose -f docker/docker-compose.yml up --build
# dashboard  http://localhost:8080
# API        http://localhost:8000
```

`templates/default.conf.template` serves the bundle and proxies `/api/v1` and
`/ws` to the API, which is why the same-origin defaults work in production too.
It is a template rather than a finished config because nginx:alpine runs
`envsubst` over it at container start, so **one image works against any API
host**:

```bash
docker run -p 8080:80 -e API_UPSTREAM=10.0.0.4:8000 beepmydevice-web
```

`API_UPSTREAM` defaults to `api:8000`, the compose service name. Only variables
starting `API_` are substituted (`NGINX_ENVSUBST_FILTER`) — without that filter
envsubst would also replace nginx's own `$host` and `$remote_addr` with empty
strings, which looks like a broken backend rather than a broken config.

The `/api/v1` prefix is stripped by the trailing slash on `proxy_pass`. The
backend mounts its routers at the root; the prefix exists only so the browser
can tell an endpoint from this dashboard's own `/devices` and `/alerts` pages.

See [`docs/DEPLOYMENT.md`](../docs/DEPLOYMENT.md) for a full deployment.

## Layout

```
src/
  config/     env (defaulted, logged) and the Firebase registration
  styles/     tokens.css → base.css → layout.css, in that order
  types/      the API envelope and the domain objects
  utils/      the single axios instance, logger, storage, formatting
  services/   one module per API area — screens never call the client directly
  contexts/   AuthContext (session), DeviceContext (list + status socket)
  hooks/      useAlerts, usePreferences, useApiErrors, useStatusSocket
  components/ the shared kit and the dialogs
  pages/      Auth · Dashboard · Devices · Activity · Alerts · Settings
```

Strictly one-directional: `pages → hooks/contexts → services → api-client`.
Nothing calls upward, and a page never imports axios.

## The rules worth knowing before editing

**One axios instance**, in `utils/api-client.ts`. A second instance or a bare
`fetch` bypasses the interceptors and sends a request with no bearer token and
no correlation ID — which fails looking like a backend bug. Every path comes
from `API_ROUTES`; no URL strings at call sites.

**The payload is at `response.data.content`.** `data` is the envelope's
container. Reading `response.data.data` — a shape this API has never
returned — yields `undefined` everywhere, which is why exactly one function
unwraps it.

**Errors branch on the code, not the HTTP status.** `AUTH_*` ends the session,
`VAL_*` marks the named field, everything else is a banner that closes itself.
Every entry in the array is rendered, not just the first. 401 and `AUTH_*` are
not the same thing: a guest at the alert endpoint gets 403 `ALERT_005`, which
must not log anyone out.

**Zero corner radius.** The design system is square-cornered; the flat corner
is the look, not an oversight. Colours, spacing and radii come from
`styles/tokens.css` and nothing else — `src/styles/tokens.test.ts` fails the
build if the palette drifts from the mobile app's `colors.ts`.

**One accent.** Blue carries the primary action, the ONLINE badge, the guest
badge and error text alike. There is no red and no green. If errors should be
red, that is a design decision made in the token sheet, not at a call site.

**Log through `utils/logger.ts`.** `no-console` is a lint error. The logger
writes the project's shared format — `[TIME] [LEVEL] [CORRELATION_ID]
[SERVICE] message` — so one correlation ID greps across the browser console
and the API log, and it redacts anything whose key looks like a credential.

## What is drawn but disabled

The canvas specifies screens the API cannot serve in Phase 1. They are rendered
and disabled with the reason stated, rather than deleted — a screen that
quietly drops half its design reads as finished when it is not.

| Control | Why |
|---|---|
| Display name, profile photo | No profile endpoint. Login returns `user_id`, `token`, `expires_at` — not even the email |
| Rename WiFi network | No endpoint exposes the network record |
| Delete account | No endpoint, and it needs a decision about the network and its guests first |
| Custom alert message | `POST /alerts/send` accepts `device_ids` only |
| Terms, privacy | No documents yet |

Two further gaps between the canvas and the server, handled rather than faked:

- The canvas offers a **"Partial"** alert status. The server has none: alert
  authorization aborts the whole request on any failure, so there is no partial
  delivery to filter for.
- **Sound / Vibration** in the send-alert modal are the *recipient's* stored
  preferences, saved to `PUT /auth/preferences`. A sender must not be able to
  override what a device's owner chose.

## What is deliberately not here

**Firebase does nothing.** The configuration is wired up so a browser build
points at the same project as the mobile apps, but the dashboard's job is to
*send* alerts, which goes through the REST API. Receiving would need a VAPID
key, a service worker, and — the part no key can fix — a WiFi BSSID, which no
browser exposes at any permission level. See `src/config/firebase.ts`.

**Filtering and sorting are client-side.** The list endpoints accept `page` and
`limit` and nothing else. Inventing query parameters would fail silently:
FastAPI ignores unknown ones, so the server would return an unfiltered page and
the UI would look like it worked. The Alerts screen says when a filter applies
to the current page only.

**The Activity figures are computed here.** There is no statistics endpoint, so
delivery rate and most-alerted come from a bounded sample of real rows, and the
screen states the window it measured.
