# BeepMyDevice - GitHub Repository Setup

## Repository Creation

### Basic Info
```
Repository Name: beepmydevice
Description: WiFi-based device finder for cross-account home devices. Find and alert all your devices (iOS, Android, Mac, Windows) on the same home WiFi network, regardless of account.
Visibility: Public
```

### Full Description
```
🔔 BeepMyDevice - Find & Alert Your Devices at Home

A cross-platform WiFi-based device alert system that works across different accounts on the same home network.

## Problem Solved
- Apple Find My requires same Apple Account
- Google Find My requires same Google Account
- No unified solution for mixed ecosystems (iPhone + Android + Mac + Windows on same WiFi)

## Solution
BeepMyDevice lets you find and alert any of your devices connected to your home WiFi, regardless of which account they use.

## Features
✅ Works across iOS, Android, Mac, Windows
✅ Cross-account support (multiple Apple IDs, Google accounts)
✅ Admin-controlled alerts (secure, only authorized person triggers)
✅ Real-time device status
✅ Push notifications (Firebase + APNs)
✅ Battery level tracking

## Tech Stack
- **Frontend:** React Native (TypeScript)
- **Backend:** Python + FastAPI
- **Database:** PostgreSQL
- **Push:** Firebase Cloud Messaging + Apple APNs

## Status
🚀 Phase 1 Development (6-8 weeks)

## Documentation
- `/docs` - Complete documentation
- `backend/README.md` - Backend setup
- `frontend/README.md` - Frontend setup
```

### Repository Settings
```
✅ Public (open source, portfolio project)
✅ Add .gitignore (Python + Node.js)
✅ Add license (MIT recommended)
✅ Initialize with README (yes)
✅ Branch protection (main branch)
```

---

## GitHub Repository Structure

### Initial Setup Commands
```bash
# 1. Create folder
mkdir beepmydevice
cd beepmydevice

# 2. Initialize git
git init
git branch -M main

# 3. Create directory structure
mkdir backend frontend docs

# 4. Create initial files
touch README.md .gitignore LICENSE

# 5. First commit
git add .
git commit -m "chore: Initial project structure"

# 6. Add remote
git remote add origin https://github.com/yourusername/beepmydevice.git

# 7. Push to GitHub
git push -u origin main
```

---

## Root Level Files

### README.md (Root Level)
```markdown
# BeepMyDevice

🔔 WiFi-based device finder for cross-account home devices

Find and alert all your devices (iOS, Android, Mac, Windows) on the same home WiFi network, regardless of account.

## 🎯 Problem & Solution

### The Problem
- Apple Find My: Requires same Apple Account
- Google Find My: Requires same Google Account
- Mixed ecosystems (multiple iPhones with different Apple IDs + Android + Mac + Windows): No solution

### The Solution
**BeepMyDevice** - A unified WiFi-based alert system that works across ANY accounts on the SAME home WiFi.

## ✨ Features

### Phase 1 (MVP)
- ✅ Cross-platform support (iOS, Android, Mac, Windows)
- ✅ Cross-account support (any login)
- ✅ Admin-controlled alerts (secure)
- ✅ Real-time device status & battery tracking
- ✅ Push notifications (Firebase + APNs)
- ✅ WebSocket for live updates

### Future Phases
- Device grouping (alert specific devices)
- Multi-admin support
- WiFi network scanning
- Custom alert sounds

## 🛠 Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React Native + TypeScript |
| Backend | Python + FastAPI |
| Database | PostgreSQL |
| Push Notifications | Firebase Cloud Messaging + Apple APNs |
| Hosting | Cloud-based (devinderpansar.com) |
| Deployment | Docker + CI/CD |

## 📁 Project Structure

```
beepmydevice/
├── backend/          # Python + FastAPI
│   ├── src/
│   ├── tests/
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/         # React Native + TypeScript
│   ├── src/
│   ├── ios/
│   ├── android/
│   ├── package.json
│   └── .env.example
│
└── docs/            # Documentation
    ├── FEATURES.md
    ├── ARCHITECTURE.md
    ├── API.md
    └── DEVELOPMENT.md
```

## 📚 Documentation

- **[Complete Documentation](./docs/COMPLETE_DOCUMENTATION.md)** - Full project specs
- **[Architecture](./docs/ARCHITECTURE.md)** - HLD + LLD
- **[API Reference](./docs/API.md)** - All endpoints
- **[Coding Standards](./docs/CODING_STANDARDS.md)** - Development guidelines
- **[Backend Setup](./backend/README.md)** - Backend instructions
- **[Frontend Setup](./frontend/README.md)** - Frontend instructions

## 🚀 Quick Start

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn src.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm start
npx react-native run-ios    # iOS
npx react-native run-android  # Android
```

## 📋 Development

### Coding Standards
- SOLID principles
- Type hints (Python + TypeScript)
- DRY, KISS, YAGNI
- Comprehensive logging
- Correlation IDs for tracing

### Response Format
All API responses follow industry standard:
```json
{
  "success": true,
  "status_code": 200,
  "data": {
    "content": [...],
    "pagination": {...}
  },
  "errors": [...],
  "correlation_id": "uuid",
  "timestamp": "ISO-8601"
}
```

### Environment Variables
**Backend (.env):** Database, JWT, Firebase, APNs credentials  
**Frontend (.env):** API URL, Firebase config, environment mode

## 🔄 Git Workflow

### Branch Strategy
```
main                    # Production-ready
├── feature/*           # New features
├── bugfix/*            # Bug fixes
├── docs/*              # Documentation
└── hotfix/*            # Critical fixes
```

### Commit Format
```
feat: Add device grouping feature
fix: Resolve heartbeat timeout issue
docs: Update API documentation
style: Format code with black
refactor: Extract auth logic
test: Add device service tests
chore: Update dependencies
```

## 🧪 Testing

### Backend
```bash
cd backend
pytest                 # Run all tests
pytest --cov=src      # With coverage
pytest -v             # Verbose
```

### Frontend
```bash
cd frontend
npm test              # Run all tests
npm test -- --coverage
```

## 📱 Platforms

| Platform | Status |
|----------|--------|
| iOS | In Development |
| Android | In Development |
| macOS | In Development |
| Windows | In Development |

## 📞 Support

### Documentation
- 📖 [Read the docs](./docs)
- 🎯 [View features](./docs/FEATURES.md)
- 🏗️ [Check architecture](./docs/ARCHITECTURE.md)

### Issues & Discussions
- 🐛 [Report bugs](https://github.com/yourusername/beepmydevice/issues)
- 💬 [Start discussions](https://github.com/yourusername/beepmydevice/discussions)

## 📝 License

MIT License - See [LICENSE](./LICENSE) file

## 🎓 Learning & Portfolio

This project is built as a learning experience and portfolio project to demonstrate:
- Full-stack development (frontend + backend)
- Cross-platform mobile development
- WebSocket real-time communication
- Authentication & authorization
- Database design & optimization
- Cloud deployment
- CI/CD pipelines

## 📅 Timeline

**Phase 1:** 6-8 weeks (MVP)  
**Phase 2:** Device grouping & multi-admin  
**Phase 3:** Advanced features

## 👨‍💻 Development

**Author:** [Your Name]  
**Started:** 2024-08-30  
**Status:** 🚀 Active Development

---

**Happy coding! 🚀**
```

### .gitignore (Root Level)
```
# General
.DS_Store
*.log
.idea/
*.swp
*.swo
build/
dist/
.env.local

# Backend
backend/.env
backend/.env.local
backend/__pycache__/
backend/*.pyc
backend/venv/
backend/.pytest_cache/
backend/.coverage
backend/htmlcov/
backend/dist/
backend/build/
backend/*.egg-info/
backend/.vscode/
backend/.idea/

# Frontend
frontend/node_modules/
frontend/.env
frontend/.env.local
frontend/.expo/
frontend/ios/Pods/
frontend/ios/Podfile.lock
frontend/ios/Pods/*
frontend/ios/.xcode.env.local
frontend/android/.gradle/
frontend/android/build/
frontend/android/app/debug/
frontend/android/app/release/
frontend/.eslintcache
frontend/coverage/
frontend/dist/
frontend/build/

# Docs
docs/.DS_Store
docs/*.swp
```

### LICENSE (MIT)
```
MIT License

Copyright (c) 2024 [Your Name]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
```

---

## Backend Directory

### backend/README.md
```markdown
# BeepMyDevice - Backend

Python + FastAPI backend for BeepMyDevice WiFi alert system.

## 📋 Quick Start

### Prerequisites
- Python 3.11+
- PostgreSQL 12+
- Redis (optional, for caching)

### Setup

1. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

4. **Initialize database**
   ```bash
   python -m alembic upgrade head
   ```

5. **Run server**
   ```bash
   uvicorn src.main:app --reload
   ```

   Server runs on: http://localhost:8000
   API Docs: http://localhost:8000/docs

## 📂 Project Structure

```
src/
├── main.py                 # FastAPI app
├── config.py               # Configuration
├── database.py             # Database connection
│
├── models/                 # Database models
├── schemas/                # Pydantic schemas
├── services/               # Business logic
├── routes/                 # API endpoints
├── utils/                  # Utilities
└── middleware/             # Middleware
```

## 🔧 Technologies

- **Framework:** FastAPI
- **Server:** Uvicorn
- **Database:** PostgreSQL + SQLAlchemy
- **Auth:** PyJWT + bcrypt
- **Push:** Firebase Admin SDK + APNs
- **Validation:** Pydantic

## 🌍 Environment Variables

See `.env.example` for all required variables:

```
DATABASE_URL=postgresql://user:pass@localhost:5432/beepmydevice
SECRET_KEY=your-secret-key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_DAYS=30
FIREBASE_PROJECT_ID=...
APPLE_TEAM_ID=...
DEBUG=False
```

## 📚 API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `POST /auth/logout` - Logout user

### Devices
- `POST /devices/register` - Register device
- `GET /devices/list` - List all devices
- `PUT /devices/{id}/heartbeat` - Update device status

### Alerts
- `POST /alerts/send` - Send alert
- `GET /alerts/logs` - Get alert history

See [API Documentation](../docs/API.md) for details.

## ✅ Testing

```bash
# Run all tests
pytest

# With coverage
pytest --cov=src

# Specific test file
pytest tests/test_auth.py

# Verbose output
pytest -v
```

## 📝 Coding Standards

- SOLID principles
- Type hints on all functions
- Comprehensive logging (DEBUG/INFO/WARNING/ERROR)
- Correlation IDs for request tracing
- DRY, KISS, YAGNI principles
- No magic numbers (use constants)

## 🚀 Deployment

### Docker
```bash
docker build -t beepmydevice-backend:latest .
docker run -p 8000:8000 beepmydevice-backend:latest
```

### Production
- Use Gunicorn for production server
- Enable HTTPS/TLS
- Configure CORS properly
- Set up logging
- Monitor with tools like Sentry

## 🔒 Security

- Passwords hashed with bcrypt
- JWT tokens with expiration
- CORS configured
- SQL injection prevention (SQLAlchemy)
- Rate limiting (recommended: implement)
- HTTPS required in production

## 📖 More Information

- [Complete Documentation](../docs/COMPLETE_DOCUMENTATION.md)
- [Architecture](../docs/ARCHITECTURE.md)
- [Coding Standards](../docs/CODING_STANDARDS.md)

---

**Questions?** Check the docs or create an issue.
```

### backend/.env.example
```
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/beepmydevice_dev

# JWT
SECRET_KEY=your-super-secret-key-change-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_DAYS=30

# Firebase (Android Push Notifications)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-key-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-email@your-project.iam.gserviceaccount.com

# Apple (iOS Push Notifications)
APPLE_TEAM_ID=your-team-id
APPLE_KEY_ID=your-key-id
APPLE_KEY_PATH=path/to/AuthKey_XXXXX.p8

# Server
SERVER_HOST=0.0.0.0
SERVER_PORT=8000
DEBUG=True
LOG_LEVEL=DEBUG

# CORS
CORS_ORIGINS=["http://localhost:3000", "http://localhost:8081"]

# Database (Optional)
DB_POOL_SIZE=10
DB_POOL_TIMEOUT=30
DB_POOL_RECYCLE=3600
```

---

## Frontend Directory

### frontend/README.md
```markdown
# BeepMyDevice - Frontend

React Native + TypeScript frontend for BeepMyDevice WiFi alert system.

## 📋 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- iOS: Xcode (for iOS development)
- Android: Android Studio (for Android development)

### Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your API URL and config
   ```

3. **Run iOS**
   ```bash
   npm run ios
   # or
   npx react-native run-ios
   ```

4. **Run Android**
   ```bash
   npm run android
   # or
   npx react-native run-android
   ```

5. **Development server**
   ```bash
   npm start
   # or
   npx react-native start
   ```

## 📂 Project Structure

```
src/
├── screens/            # Screen components
├── components/         # Reusable components
├── services/           # API & services
├── hooks/              # Custom hooks
├── context/            # React Context
├── types/              # TypeScript types
├── utils/              # Utility functions
├── styles/             # Theme & styles
└── navigation/         # Navigation setup
```

## 🔧 Technologies

- **Framework:** React Native
- **Language:** TypeScript
- **Navigation:** React Navigation
- **State:** React Context API
- **HTTP:** axios
- **Push:** React Native Push Notification + Firebase
- **Storage:** AsyncStorage

## 🌍 Environment Variables

See `.env.example` for all required variables:

```
API_BASE_URL=http://localhost:8000
API_TIMEOUT=10000
FIREBASE_CONFIG_ANDROID={...}
APPLE_TEAM_ID=XXXXXXXXXX
LOG_LEVEL=DEBUG
ENVIRONMENT=development
```

## 📱 Screens

### Auth Stack
- LoginScreen
- RegisterScreen
- SplashScreen

### App Stack
- DashboardScreen (main)
- DeviceDetailScreen
- SettingsScreen
- ProfileScreen

## 🧩 Components

- `ErrorAlert` - Error display (auto-close 5s)
- `DeviceCard` - Device item
- `LoadingSpinner` - Loading indicator
- `StatusBadge` - Online/offline status
- `BatteryIndicator` - Battery level

## 🔗 Services

- `api.ts` - HTTP client with correlation ID
- `auth.ts` - Authentication logic
- `device.ts` - Device operations
- `alert.ts` - Alert operations
- `notification.ts` - Push notification handling
- `websocket.ts` - WebSocket connection

## 🎣 Hooks

- `useAuth()` - Authentication state
- `useDevices()` - Device management
- `useWebSocket()` - Real-time updates
- `useErrors()` - Error handling
- `usePushNotifications()` - Push setup

## ✅ Testing

```bash
npm test
npm test -- --coverage
npm test -- --watch
```

## 📝 Coding Standards

- TypeScript strict mode
- Type hints on all functions
- Component composition
- Custom hooks for logic
- Error handling with correlation IDs
- ESLint + Prettier configured

## 🚀 Build

### iOS Release
```bash
npm run build:ios
# Upload via Xcode / App Store Connect
```

### Android Release
```bash
npm run build:android
# Upload via Google Play Console
```

## 🔒 Security

- No hardcoded API keys
- Token stored in secure storage
- SSL pinning recommended
- Input validation on forms
- No sensitive data in logs

## 📖 More Information

- [Complete Documentation](../docs/COMPLETE_DOCUMENTATION.md)
- [Architecture](../docs/ARCHITECTURE.md)
- [Coding Standards](../docs/CODING_STANDARDS.md)

---

**Questions?** Check the docs or create an issue.
```

### frontend/.env.example
```
# API Configuration
API_BASE_URL=http://localhost:8000
API_TIMEOUT=10000

# Firebase Configuration (Android)
FIREBASE_CONFIG_ANDROID={"apiKey": "...", "projectId": "...", ...}

# Apple Configuration (iOS)
APPLE_TEAM_ID=XXXXXXXXXX

# App Configuration
ENVIRONMENT=development
LOG_LEVEL=DEBUG
DEBUG_MODE=true
```

---

## Docs Directory

### docs/README.md
```markdown
# BeepMyDevice - Documentation

Complete documentation for BeepMyDevice project.

## 📚 Guides

- [FEATURES.md](./FEATURES.md) - Complete feature list
- [ARCHITECTURE.md](./ARCHITECTURE.md) - HLD + LLD
- [API.md](./API.md) - API reference
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development guide
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide

## 🎯 Quick Links

- [Backend Setup](../backend/README.md)
- [Frontend Setup](../frontend/README.md)
- [Coding Standards](./CODING_STANDARDS.md)
- [Complete Specification](./COMPLETE_DOCUMENTATION.md)

## 📖 Getting Started

1. Read [FEATURES.md](./FEATURES.md) - Understand what we're building
2. Read [ARCHITECTURE.md](./ARCHITECTURE.md) - Understand the design
3. Follow [Backend Setup](../backend/README.md) - Start backend dev
4. Follow [Frontend Setup](../frontend/README.md) - Start frontend dev
5. Check [Coding Standards](./CODING_STANDARDS.md) - Code guidelines

## 🔍 FAQ

**Q: Why WiFi-based?**  
A: To work across different accounts on same home network (Apple + Google ecosystem problem)

**Q: Why cloud-based?**  
A: No need for hub device at home, always available, easier to scale

**Q: When will Phase 2 be ready?**  
A: After Phase 1 MVP is complete (estimated Week 10)

**Q: Can I run locally?**  
A: Phase 2 will add local-only mode for privacy

---

All docs are version 1.0 (Last updated: 2024-08-30)
```

---

## Initial Commit & Push

### Push All Docs Today
```bash
# 1. Navigate to project
cd beepmydevice

# 2. Create backend folder and structure
mkdir -p backend/src backend/tests
touch backend/README.md
touch backend/.env.example
touch backend/requirements.txt

# 3. Create frontend folder and structure
mkdir -p frontend/src frontend/ios frontend/android
touch frontend/README.md
touch frontend/.env.example
touch frontend/package.json

# 4. Create docs folder
mkdir -p docs
touch docs/README.md

# 5. Copy all documentation files
# (Copy the 4 docs we created earlier into docs/ folder)

# 6. Add all files
git add .

# 7. Initial commit
git commit -m "docs: Initial project setup with complete documentation

- Add project README with overview
- Add backend structure and setup guide
- Add frontend structure and setup guide
- Add comprehensive documentation
- Add coding standards
- Add .gitignore, LICENSE, environment examples
- Prepare for Phase 1 development"

# 8. Push to GitHub
git push -u origin main

# 9. View on GitHub
# https://github.com/yourusername/beepmydevice
```

---

## GitHub Branch Protection (Recommended)

### Settings → Branches → Add Rule
```
Branch name pattern: main

Rules:
✅ Require pull request reviews before merging (1 review)
✅ Require status checks to pass before merging
✅ Require branches to be up to date before merging
✅ Require code reviews before merging
✅ Dismiss stale pull request approvals
✅ Require conversation resolution before merging
```

---

## GitHub Project Board (Optional)

Create a project board with columns:
- Backlog
- In Progress
- In Review
- Done

Add issues for:
- Backend auth system
- Device registration
- Alert system
- Frontend screens
- Testing & deployment

---

## .github Workflows (CI/CD)

### .github/workflows/backend-tests.yml
```yaml
name: Backend Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: password
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - run: pip install -r backend/requirements.txt
      - run: cd backend && pytest
```

### .github/workflows/frontend-tests.yml
```yaml
name: Frontend Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: cd frontend && npm install
      - run: cd frontend && npm test
      - run: cd frontend && npm run lint
```

---

## Repository Details Summary

```
Repository: beepmydevice
Visibility: Public
License: MIT
Description: WiFi-based device finder for cross-account home devices

Structure:
├── /backend (Python + FastAPI)
│   ├── README.md (Setup & run instructions)
│   └── .env.example (Backend environment variables)
│
├── /frontend (React Native + TypeScript)
│   ├── README.md (Setup & run instructions)
│   └── .env.example (Frontend environment variables)
│
├── /docs (Complete documentation)
│   └── README.md (Documentation index)
│
├── README.md (Main project overview)
├── .gitignore (Git ignore rules)
└── LICENSE (MIT License)

Environment Variables:
✅ Backend .env: Database, JWT, Firebase, APNs credentials
✅ Frontend .env: API URL, Firebase config, environment mode
⚠️ .env files are in .gitignore (not pushed to GitHub)
⚠️ Use .env.example as template for your local .env

Coding Standards:
✅ SOLID principles
✅ Type hints (Python + TypeScript)
✅ Comprehensive logging
✅ Correlation IDs
✅ Error handling (array format)
✅ Documentation (docstrings + comments)

First Commit Includes:
✅ Project structure
✅ All 4 documentation files
✅ README files for each folder
✅ .env.example templates
✅ .gitignore
✅ LICENSE
✅ GitHub workflows (CI/CD)
```

---

**Ready to push to GitHub today!** 🚀

