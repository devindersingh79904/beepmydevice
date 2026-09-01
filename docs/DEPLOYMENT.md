# Deployment Guide

Target: `beepmydevice.com`, hosted alongside the existing
`devinderpansar.com` infrastructure.

---

## Topology

```
Internet
   |  HTTPS 443 / WSS
   v
Nginx  (TLS termination, reverse proxy, WebSocket upgrade)
   |                        |
   |  HTTP 8000             |  HTTP 80
   v                        v
Uvicorn                   Dashboard  (nginx serving web/dist)
   |                        |
   |                        '--> proxies /api/v1 and /ws back to Uvicorn
   v
PostgreSQL 17
```

Uvicorn never faces the internet directly. Nginx terminates TLS, handles the
WebSocket upgrade, and applies connection limits.

The dashboard is a third deployable (`web/`, its own Dockerfile). It carries
its own nginx, which serves the static bundle and proxies the two API paths, so
the browser sees one origin and needs no CORS entry. Putting it on a separate
origin also works -- see **Dashboard** below.

---

## Prerequisites

- A server with Docker and Docker Compose
- A DNS A record for `beepmydevice.com` pointing at it
- PostgreSQL 12+, either containerised or managed. **17 is what the suite
  is run against** (98 tests, both migrations) and what compose and CI
  pin; anything from 12 up should work, but 17 is the verified one
- Firebase service-account credentials
- An APNs `.p8` key, its key ID and your team ID

---

## Backend

### Production environment

Copy `.env.example` to `.env` on the server and set:

```
ENVIRONMENT=production
DEBUG=False
LOG_LEVEL=INFO
SECRET_KEY=<a freshly generated 64-byte key, never the dev one>
DATABASE_URL=postgresql://user:password@db-host:5432/beepmydevice
CORS_ORIGINS=["https://beepmydevice.com"]
APPLE_USE_SANDBOX=False
```

`ENVIRONMENT=production` disables `/docs` and `/redoc` automatically.

**The scheme must be `postgresql://`, not `postgres://`.** Managed-database
panels (EasyPanel, Heroku, Render) hand you a URL beginning `postgres://`.
SQLAlchemy 2.0 removed that alias, so pasting it verbatim fails at import with
`Can't load plugin: sqlalchemy.dialects:postgres` — before the app logs
anything of its own. Rewrite the scheme; the rest of the URL, `?sslmode=`
included, is passed through to psycopg2 unchanged.

On a platform where you set variables in a form rather than a file, the same
values apply, and two are easy to miss: `LOG_FILE_PATH=` (empty, see below) and
`RUN_MIGRATIONS=true` on the first deploy, since there is no volume to have
been migrated already. If neither `DATABASE_URL` nor `SECRET_KEY` is set at
all, the container exits at import with a pydantic `2 validation errors for
Settings` — that is the guard working, not a build problem.

`APPLE_USE_SANDBOX=False` is easy to forget and fails silently — sandbox tokens
are rejected by the production APNs endpoint, so alerts simply never arrive.

Never reuse the development `SECRET_KEY`. Rotating it invalidates every issued
token and forces all users to log in again, so generate the production key once
and store it in your secret manager.

### Build and run

```bash
cd backend/docker
docker compose up -d --build
docker compose exec api python -m alembic upgrade head
```

The image builds from `backend/Dockerfile` with `backend/` as its context.
That is the conventional location on purpose: a platform building from the
repo (EasyPanel, Railway, Render) is pointed at build path `backend` and finds
`Dockerfile` with no further configuration.

**Migrations run as a separate step, not on container start.** An automatic
migration on boot means a crash-looping container attempts the same migration
on every restart.

The image's entrypoint *can* run them, gated behind `RUN_MIGRATIONS=true`. The
compose file sets it, because a `docker compose up` against an empty volume
otherwise starts an API with no tables -- which reports healthy and then 500s
on the first query, with the real cause (`relation "users" does not exist`)
buried in a stack trace. Leave it unset for a real deploy and keep the explicit
step above.

Two container settings worth knowing:

- **`LOG_FILE_PATH` should be empty in a container.** Logs then go to stdout,
  where `docker logs` and every hosting platform read them. A log file inside a
  container is written to a layer discarded when the container is replaced, so
  the lines you most want after a crash are the ones guaranteed to be gone.
- The image runs as a non-root user, and `/app` is chowned to it so a
  configured log path still works. Without that, a set `LOG_FILE_PATH` fails
  with `Permission denied: 'logs'` in a restart loop, behind a healthcheck that
  never passes.

### Verify

```bash
curl https://beepmydevice.com/health
docker compose logs -f api
```

---

## Nginx

```nginx
server {
    listen 443 ssl http2;
    server_name beepmydevice.com;

    ssl_certificate     /etc/letsencrypt/live/beepmydevice.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/beepmydevice.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ws/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade    $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host       $host;

        # Heartbeats arrive every 30s; the default 60s read timeout would
        # close idle dashboard sockets between them.
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}

server {
    listen 80;
    server_name beepmydevice.com;
    return 301 https://$host$request_uri;
}
```

TLS via Let's Encrypt:

```bash
sudo certbot --nginx -d beepmydevice.com
```

Renewal is automatic; confirm with `sudo certbot renew --dry-run`.

---

## Worker count

Run **one** Uvicorn worker for now.

Two structures live in process memory, and both break silently when there is
more than one process -- whether that is a second worker or a second replica
behind a load balancer.

`WebSocketManager` keeps connections in process memory, so a heartbeat handled
by worker A never reaches a dashboard connected to worker B — the status
display silently stops updating for some users while continuing to look live.

**The revoked-token set is the sharper one.** A token revoked by logout on one
process is still accepted by the other, so signing out does not end the
session. That is a security defect, not a degraded experience.

Redis-backed pub/sub is the Phase 2 fix for both. Until then a single worker is
a correctness requirement, not a performance choice, and `--workers 1` is
written into the image's `CMD` so it is not left to a default. If your platform
has a replicas or min-instances setting, it must be 1.

---

## Database

```bash
# Backup
pg_dump -Fc beepmydevice > backup-$(date +%F).dump

# Restore
pg_restore -d beepmydevice --clean backup-2026-08-30.dump
```

Schedule daily backups and test a restore before you need one. Use PgBouncer if
the connection count grows past what `DB_POOL_SIZE` comfortably covers.

---

## Dashboard

Its own image, with its own nginx:

```bash
docker build -t beepmydevice-web ./web
docker run -p 8080:80 -e API_UPSTREAM=127.0.0.1:8000 beepmydevice-web
```

`API_UPSTREAM` is substituted at container **start**, not baked in, so one
image serves any environment. Only variables beginning `API_` are substituted
(`NGINX_ENVSUBST_FILTER`); without that filter envsubst would also replace
nginx's own `$host` and `$remote_addr` with empty strings, which presents as a
broken backend rather than a broken config.

The browser calls `/api/v1/*`, and nginx strips the prefix via the trailing
slash on `proxy_pass`. The backend mounts its routers at the root; the prefix
exists only so the browser can tell an endpoint from the dashboard's own
`/devices` and `/alerts` pages, which would otherwise be ambiguous on a shared
origin. **Dropping that trailing slash 404s every request.**

To serve the dashboard from a different origin instead, bake absolute URLs in
at build time — Vite inlines them:

```bash
docker build -t beepmydevice-web \
  --build-arg VITE_API_BASE_URL=https://api.beepmydevice.com \
  --build-arg VITE_WS_URL=wss://api.beepmydevice.com/ws/status ./web
```

Then add that origin to `CORS_ORIGINS` on the API, or every browser call fails
preflight. `CORS_ORIGINS` defaults to an empty list — nothing is allowed
until it is set.

---

## A PostgreSQL gotcha

**`initdb` only runs on an empty volume.** Changing `POSTGRES_USER` or
`POSTGRES_PASSWORD` in the compose file does nothing to a volume that already
exists: the old role stays, and the API fails with `password authentication
failed for user ...`, which reads like a wrong password rather than a stale
volume.

A fresh host never hits this. On a machine that has run an earlier
configuration, either match the existing credentials or destroy the volume:

```bash
docker compose -f docker/docker-compose.yml down -v   # destroys the data
```

### And a major version cannot be changed in place

The same volume rule bites harder on an upgrade. A data directory belongs to
the major version that created it, and a newer server refuses to open it:

```
FATAL:  database files are incompatible with server
DETAIL: The data directory was initialized by PostgreSQL version 15,
        which is not compatible with this version 17.11.
```

So bumping `image:` from 15 to 17 does not migrate anything — it stops the
database from starting. Moving real data across a major version means a dump
and restore, taken **with the old version still running**:

```bash
# with the 15 container still up
docker compose exec db pg_dump -U beepmydevice -Fc beepmydevice > pre-upgrade.dump

# then change the image, recreate the volume, and load it back
docker compose down -v
docker compose up -d db
docker compose exec -T db pg_restore -U beepmydevice -d beepmydevice --clean < pre-upgrade.dump
```

A development volume holding nothing you care about is simpler: `down -v` and
let it re-initialise.

---

## Mobile releases

### Android

```bash
cd frontend
npm run build:android
# android/app/build/outputs/apk/release/app-release.apk
```

Sign with your upload key and publish through the Google Play Console. Ship the
production `google-services.json`, which is gitignored.

**A release build requires HTTPS.** Android 9+ blocks cleartext HTTP, and
`usesCleartextTraffic` is set only in the *debug* variant
(`android/app/src/debug/AndroidManifest.xml`). A release APK pointed at an
`http://` API fails every request; against `https://` it works and that flag
stops mattering.

### iOS

```bash
cd frontend
npm run build:ios
```

Archive in Xcode and upload via Organizer to App Store Connect. Confirm the
production APNs environment is selected — a build shipped against sandbox
receives no alerts, with no error to indicate why.

Before either release, point `.env` at production:

```
API_BASE_URL=https://beepmydevice.com
WS_BASE_URL=wss://beepmydevice.com
ENVIRONMENT=production
LOG_LEVEL=WARNING
DEBUG_MODE=false
```

---

## Release checklist

- [ ] `SECRET_KEY` freshly generated, not the dev value
- [ ] `ENVIRONMENT=production`, `DEBUG=False`
- [ ] `APPLE_USE_SANDBOX=False`
- [ ] `CORS_ORIGINS` restricted to the production origin
- [ ] Migrations applied
- [ ] TLS certificate valid, renewal tested
- [ ] `/health` returns 200 through Nginx
- [ ] WebSocket upgrade verified through Nginx, not just against Uvicorn
- [ ] Push tested end-to-end on a real iOS device and a real Android device
- [ ] Database backup taken and a restore rehearsed
- [ ] Frontend `.env` pointing at production
- [ ] Single Uvicorn worker confirmed, and replicas set to 1
- [ ] `LOG_FILE_PATH` empty so logs reach stdout
- [ ] Dashboard reachable, and a client route (`/devices`) survives a reload
- [ ] `API_UPSTREAM` or `VITE_API_BASE_URL` pointing at the real API

---

## Rollback

```bash
cd backend/docker
docker compose down
docker compose up -d <previous-image-tag>
docker compose exec api python -m alembic downgrade -1   # only if the release migrated
```

Roll the schema back only when the release actually applied a migration, and
only when that migration is reversible. A destructive migration is not
recoverable this way — restore from backup instead.
