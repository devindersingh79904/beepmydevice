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
   |  HTTP 8000
   v
Uvicorn  (Docker container)
   |
   v
PostgreSQL 15
```

Uvicorn never faces the internet directly. Nginx terminates TLS, handles the
WebSocket upgrade, and applies connection limits.

---

## Prerequisites

- A server with Docker and Docker Compose
- A DNS A record for `beepmydevice.com` pointing at it
- PostgreSQL 12+, either containerised or managed
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

Migrations run as a separate step, not on container start — an automatic
migration on boot means a crash-looping container can attempt the same
migration repeatedly.

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

`WebSocketManager` keeps connections in process memory, so with multiple workers
a heartbeat handled by worker A never reaches a dashboard connected to worker B
— the status display silently stops updating for some users. Redis-backed
pub/sub is the Phase 2 fix; until then, a single worker is a correctness
requirement, not a performance choice.

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

## Mobile releases

### Android

```bash
cd frontend
npm run build:android
# android/app/build/outputs/apk/release/app-release.apk
```

Sign with your upload key and publish through the Google Play Console. Ship the
production `google-services.json`, which is gitignored.

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
- [ ] Single Uvicorn worker confirmed

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
