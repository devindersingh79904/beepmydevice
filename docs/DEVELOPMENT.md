# Development Guide

---

## First-time setup

```bash
git clone git@github.com:devindersingh79904/beepmydevice.git
cd beepmydevice
```

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python -c "import secrets; print(secrets.token_urlsafe(64))"   # paste into SECRET_KEY
python -m alembic upgrade head
uvicorn src.main:app --reload
```

The app refuses to start while `SECRET_KEY` is the `.env.example` placeholder.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
cd ios && pod install && cd ..    # iOS only
npm run ios                        # or: npm run android
```

### Verify

- Backend: <http://localhost:8000/docs> renders Swagger
- Health: `curl http://localhost:8000/health`
- Frontend: app launches on the simulator
- Database: `psql -d beepmydevice_dev -c "\dt"` lists four tables

---

## Testing on a physical device

`localhost` on a phone points at the phone. Set `API_BASE_URL` in
`frontend/.env` to your machine's LAN address:

```
API_BASE_URL=http://192.168.1.20:8000
WS_BASE_URL=ws://192.168.1.20:8000
```

Then bind the backend to all interfaces (`SERVER_HOST=0.0.0.0`, already the
default) and allow the port through your firewall.

Push notifications cannot be tested on a simulator. iOS requires a real device
and a paid Apple Developer account; Android works on an emulator with Google
Play services.

---

## Daily workflow

```bash
git pull origin master
git checkout -b feature/device-grouping
# work
git commit -m "feat: add device groups to alert service"
git push origin feature/device-grouping
# open a PR against master
```

**Branches:** `feature/…`, `bugfix/…`, `docs/…`, `hotfix/…`
**Commits:** `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`, `chore:`
One logical change per commit.

---

## Before committing

```bash
# Backend
cd backend && black src/ && pylint src/ && mypy src/ && pytest

# Frontend
cd frontend && npm run lint && npm run typecheck && npm test
```

Both suites run in CI on every push and pull request.

---

## Database changes

Never edit a table by hand. Generate a migration:

```bash
cd backend
python -m alembic revision --autogenerate -m "add device_groups table"
# review the generated file — autogenerate misses renames and constraints
python -m alembic upgrade head
```

Roll back one step with `python -m alembic downgrade -1`.

`scripts/init_db.py` creates tables directly from the models. It is a
convenience for a throwaway local database only — anything that must reach
production goes through a migration.

---

## Running a single test

```bash
# Backend
pytest tests/test_alerts.py
pytest tests/test_alerts.py::TestAlertAuthorization
pytest tests/test_alerts.py::TestAlertAuthorization::test_rejects_non_admin_sender_with_alert_003
pytest -k "heartbeat"

# Frontend
npm test -- hooks.test.ts
npm test -- -t "auto-clears errors"
```

---

## Coding standards

Three documents, in order of specificity:

1. [`CODING_STANDARDS.md`](CODING_STANDARDS.md) — the cross-cutting contract:
   response envelope, error codes, logging, correlation IDs, pagination.
2. [`../backend/docs/CODING_STYLE.md`](../backend/docs/CODING_STYLE.md) —
   Python and FastAPI specifics.
3. [`../frontend/docs/CODING_STYLE.md`](../frontend/docs/CODING_STYLE.md) —
   React Native and TypeScript specifics.

Claude Code skills for each side live in `.claude/skills/` and load the relevant
rules automatically when working in that directory.

---

## Troubleshooting

**`SECRET_KEY` validation error on startup** — expected. Generate a real key.

**Metro cache errors after changing `babel.config.js`** —
`npm start -- --reset-cache`.

**Path aliases resolve in the editor but fail at runtime** — aliases are defined
twice, in `tsconfig.json` (type-checking) and `babel.config.js` (bundling).
Both must be updated together.

**`getWifiMacAddress` returns null** — location permission is denied. Both
platforms treat the BSSID as location data. The app cannot identify the network
without it.

**Alerts stop arriving with no error** — the push token rotated and was not
re-registered. Check `onTokenRefresh` is wired up.

**Dashboard status stops updating** — the WebSocket dropped and did not
reconnect, or the API is running multiple workers. `WebSocketManager` is
in-process; multi-worker needs the Redis pub/sub planned for Phase 2.
