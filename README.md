# BeepMyDevice

**Find & Alert Your Devices at Home**

[![Backend Tests](https://github.com/devindersingh79904/beepmydevice/actions/workflows/backend-tests.yml/badge.svg)](https://github.com/devindersingh79904/beepmydevice/actions/workflows/backend-tests.yml)
[![Frontend Tests](https://github.com/devindersingh79904/beepmydevice/actions/workflows/frontend-tests.yml/badge.svg)](https://github.com/devindersingh79904/beepmydevice/actions/workflows/frontend-tests.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

BeepMyDevice makes any device on your home WiFi ring, regardless of which account it is
signed in to. Pick a device from the dashboard, tap **Send Alert**, and it beeps and
vibrates until you find it.

---

## The Problem

A typical household has an iPhone on one Apple ID, an iPad on another, an Android phone
on a Google account, a MacBook, and a Windows laptop. Every existing device finder is
locked to a single ecosystem *and* a single account:

| Tool | Cross-platform | Cross-account | Needs a hub |
|---|---|---|---|
| Apple Find My | Apple only | No — same Apple ID | No |
| Google Find My Device | Android only | No — same Google account | No |
| Tile / AirTag | Any (with tag) | Per-tag account | No |
| **BeepMyDevice** | **iOS, Android, macOS, Windows** | **Yes — any accounts** | **No** |

## The Solution

BeepMyDevice groups devices by **the WiFi network they are connected to** rather than by
the account they are signed in to. Any device that reports the same WiFi MAC address
belongs to the same alert group, so an admin can beep all of them from one screen —
no shared login, no home hub, no bridge device.

Because alerts only reach devices on the same network as the sender, the WiFi itself acts
as the proximity check: you can only ring devices that are already within earshot.

---

## Key Features (Phase 1 — MVP)

- **Cross-account alerts** — beep devices signed in to different Apple IDs and Google accounts
- **Cross-platform** — one React Native app for iOS, Android, macOS and Windows
- **Real-time dashboard** — live online/offline status and battery level over WebSocket
- **Admin-controlled** — only the network owner can trigger alerts; ownership and network
  membership are verified server-side on every request
- **Push-based delivery** — Firebase Cloud Messaging (Android) and APNs (iOS); no local
  network daemon required
- **Alert history** — every alert is logged with its delivery status for auditing
- **30-second heartbeat** — devices report status and battery continuously

**Phase 2:** device grouping, selective alerts, multi-admin support.
**Phase 3:** WiFi scanning for unknown devices, custom alert sounds, GPS location, statistics.

See [`docs/FEATURES.md`](docs/FEATURES.md) for the complete breakdown.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile / desktop app | React Native, TypeScript, React Navigation v6 |
| State | React Context API |
| Backend API | Python 3.11+, FastAPI, Uvicorn (ASGI) |
| ORM | SQLAlchemy 2.0+ |
| Database | PostgreSQL 12+ |
| Migrations | Alembic |
| Auth | JWT (30-day expiry), bcrypt |
| Validation | Pydantic v2 |
| Real-time | Native FastAPI WebSockets |
| Push (Android) | Firebase Cloud Messaging via `firebase-admin` |
| Push (iOS) | Apple Push Notification service (`.p8` token auth) |
| Container | Docker, docker-compose |
| CI/CD | GitHub Actions |
| Hosting | Nginx reverse proxy → Uvicorn, Let's Encrypt TLS |

---

## Project Structure

```
beepmydevice/
├── backend/          FastAPI service — routes → services → models
│   ├── src/
│   │   ├── models/       SQLAlchemy ORM models
│   │   ├── schemas/      Pydantic request/response contracts
│   │   ├── services/     All business logic (auth, device, alert, push, ws)
│   │   ├── routes/       HTTP + WebSocket endpoints (thin)
│   │   ├── middleware/   Auth and request/response logging
│   │   └── utils/        Logger, response envelope, validators, constants
│   ├── tests/            pytest suite
│   ├── migrations/       Alembic versions
│   ├── docker/           Dockerfile + docker-compose
│   └── scripts/          DB init and seed helpers
│
├── frontend/         React Native app
│   └── src/
│       ├── screens/      AuthStack (login/register) + AppStack (dashboard etc)
│       ├── components/   Reusable UI pieces
│       ├── services/     API, WebSocket and push-notification clients
│       ├── hooks/        useAuth, useDevices, useWebSocket, useErrors
│       ├── context/      Auth, Device and Error providers
│       ├── navigation/   Root / Auth / App navigators
│       └── styles/       Theme, colors, spacing
│
├── docs/             Specifications, architecture, API reference, standards
└── .github/          CI workflows and issue templates
```

---

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 12+
- Xcode 15+ (for iOS builds) / Android Studio (for Android builds)
- A Firebase project with Cloud Messaging enabled (Android push)
- An Apple Developer account with an APNs `.p8` key (iOS push)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env              # then fill in your values
python -m alembic upgrade head
uvicorn src.main:app --reload
```

Interactive API docs: <http://localhost:8000/docs>

### Frontend

```bash
cd frontend
npm install
cp .env.example .env              # then fill in your values
npm run ios                       # or: npm run android
```

The iOS simulator cannot reach `localhost` from a physical device — set
`API_BASE_URL` to your machine's LAN IP when testing on real hardware.

---

## Testing

```bash
# Backend
cd backend
pytest                            # all tests
pytest tests/test_auth.py         # one file
pytest --cov=src --cov-report=term-missing

# Frontend
cd frontend
npm test
npm test -- --coverage
npm run lint
```

Target coverage is 70% minimum. Both suites run on every push and pull request.

---

## Documentation

| Guide | Purpose |
|---|---|
| [docs/README.md](docs/README.md) | Documentation index — start here |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | High- and low-level design |
| [docs/API.md](docs/API.md) | Endpoint reference, response envelope, error codes |
| [docs/FEATURES.md](docs/FEATURES.md) | Feature list by phase |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Local setup and daily workflow |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Production deployment |
| [docs/CODING_STANDARDS.md](docs/CODING_STANDARDS.md) | Conventions all code must follow |

---

## Git Workflow

```bash
git checkout -b feature/device-grouping
# ... work ...
git commit -m "feat: add device grouping to alert service"
git push origin feature/device-grouping
# open a pull request against master
```

**Branches:** `feature/…`, `bugfix/…`, `docs/…`, `hotfix/…`
**Commits:** `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`, `chore:`

---

## Platform Status

| Platform | Status |
|---|---|
| Android | Planned — Phase 1 |
| iOS | Planned — Phase 1 |
| macOS | Planned — Phase 1 |
| Windows | Planned — Phase 1 |

---

## License

MIT — see [LICENSE](LICENSE).
