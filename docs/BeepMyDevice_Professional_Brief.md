# BeepMyDevice - Project Setup & Architecture Brief

## Executive Summary

I'm starting a personal project called **BeepMyDevice** - a cross-platform WiFi-based device alert system. The project needs to be structured with proper separation of concerns, documented with industry standards, and ready for 6-8 weeks of development.

I need you to:
1. Create the complete project skeleton with all folders
2. Set up proper folder structures for backend, frontend, and documentation
3. Place all existing documentation in the correct locations
4. Create foundational files with proper setup instructions
5. Document all coding standards and development rules

This is a **learning + portfolio project**, so it needs to be production-ready from day one with senior-level architecture and documentation.

---

## Project Context

### What We're Building
A WiFi-based device finder that works across different accounts on the same home network. Unlike Apple Find My (requires same Apple Account) or Google Find My (requires same Google Account), **BeepMyDevice** works across ANY accounts on the SAME home WiFi.

**Key differentiator:** Multi-device (iOS, Android, Mac, Windows), multi-account (different Apple IDs, Google accounts), same WiFi network.

### Tech Stack (Confirmed)
- **Frontend:** React Native + TypeScript (all platforms)
- **Backend:** Python + FastAPI (async, WebSocket support)
- **Database:** PostgreSQL 12+
- **Push Notifications:** Firebase Cloud Messaging (Android) + Apple APNs (iOS)
- **Hosting:** Cloud-based (existing devinderpansar.com)
- **Deployment:** Docker + CI/CD

### Timeline
- **Phase 1 (MVP):** 6-8 weeks
- **Phase 2:** Device grouping, multi-admin
- **Phase 3:** Advanced features (WiFi scanning, custom sounds, etc)

---

## Detailed Requirements

### 1. Project Structure - Exact Folder Layout

Create this complete folder structure:

```
beepmydevice/
│
├── README.md                                  # Main project overview
├── .gitignore                                # Git ignore (Python + Node.js)
├── LICENSE                                   # MIT License
│
├── backend/
│   ├── README.md                             # Backend setup & quick start
│   ├── .env.example                          # Environment template (Database, JWT, Firebase, APNs)
│   ├── requirements.txt                      # Python dependencies (FastAPI, SQLAlchemy, etc)
│   ├── setup.py                              # Package setup
│   ├── pyproject.toml                        # Project metadata
│   │
│   ├── src/
│   │   ├── __init__.py
│   │   ├── main.py                           # FastAPI app entry point
│   │   ├── config.py                         # Configuration & constants
│   │   ├── database.py                       # PostgreSQL connection
│   │   │
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── user.py                       # User model
│   │   │   ├── device.py                     # Device model
│   │   │   ├── wifi_network.py               # WiFi network model
│   │   │   └── alert_log.py                  # Alert history model
│   │   │
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── user.py                       # Pydantic schemas for user
│   │   │   ├── device.py                     # Pydantic schemas for device
│   │   │   └── alert.py                      # Pydantic schemas for alert
│   │   │
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── auth_service.py               # Authentication logic
│   │   │   ├── device_service.py             # Device management logic
│   │   │   ├── alert_service.py              # Alert routing logic
│   │   │   ├── notification_service.py       # Firebase + APNs integration
│   │   │   └── websocket_manager.py          # WebSocket for real-time updates
│   │   │
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py                       # /auth/* endpoints
│   │   │   ├── devices.py                    # /devices/* endpoints
│   │   │   ├── alerts.py                     # /alerts/* endpoints
│   │   │   └── websocket.py                  # /ws/* WebSocket
│   │   │
│   │   ├── utils/
│   │   │   ├── __init__.py
│   │   │   ├── logger.py                     # Logging setup
│   │   │   ├── responses.py                  # Response helper functions
│   │   │   ├── validators.py                 # Input validation
│   │   │   └── constants.py                  # All constants (no magic numbers)
│   │   │
│   │   └── middleware/
│   │       ├── __init__.py
│   │       ├── auth_middleware.py            # JWT token validation
│   │       └── logging_middleware.py         # Request/response logging
│   │
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── conftest.py                       # pytest fixtures
│   │   ├── test_auth.py                      # Auth tests
│   │   ├── test_devices.py                   # Device tests
│   │   └── test_alerts.py                    # Alert tests
│   │
│   ├── migrations/
│   │   └── versions/                         # Alembic migrations
│   │
│   ├── docker/
│   │   ├── Dockerfile
│   │   └── docker-compose.yml
│   │
│   └── scripts/
│       ├── init_db.py                        # Database initialization
│       └── seed_data.py                      # Test data seeding
│
├── frontend/
│   ├── README.md                             # Frontend setup & quick start
│   ├── .env.example                          # Environment template (API URL, Firebase, etc)
│   ├── package.json                          # Node.js dependencies & scripts
│   ├── tsconfig.json                         # TypeScript config
│   ├── app.json                              # Expo/React Native config
│   ├── babel.config.js                       # Babel config
│   ├── .eslintrc.json                        # ESLint rules
│   │
│   ├── src/
│   │   ├── App.tsx                           # Root component
│   │   ├── index.js                          # Entry point
│   │   │
│   │   ├── types/
│   │   │   ├── index.ts                      # Exported types
│   │   │   ├── api.ts                        # API response types
│   │   │   ├── device.ts                     # Device types
│   │   │   └── user.ts                       # User types
│   │   │
│   │   ├── screens/
│   │   │   ├── AuthStack/
│   │   │   │   ├── LoginScreen.tsx
│   │   │   │   ├── RegisterScreen.tsx
│   │   │   │   └── SplashScreen.tsx
│   │   │   │
│   │   │   └── AppStack/
│   │   │       ├── DashboardScreen.tsx       # Main screen (device list + send alert)
│   │   │       ├── DeviceDetailScreen.tsx
│   │   │       ├── SettingsScreen.tsx
│   │   │       └── ProfileScreen.tsx
│   │   │
│   │   ├── components/
│   │   │   ├── ErrorAlert.tsx                # Error display (auto-close 5s)
│   │   │   ├── DeviceCard.tsx                # Device list item
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── StatusBadge.tsx               # Online/offline indicator
│   │   │   ├── BatteryIndicator.tsx
│   │   │   └── AlertModal.tsx                # Alert confirmation
│   │   │
│   │   ├── services/
│   │   │   ├── api.ts                        # HTTP client (with correlation ID)
│   │   │   ├── auth.ts                       # Auth service
│   │   │   ├── device.ts                     # Device API calls
│   │   │   ├── alert.ts                      # Alert API calls
│   │   │   ├── notification.ts               # Push notification handling
│   │   │   └── websocket.ts                  # WebSocket service
│   │   │
│   │   ├── hooks/
│   │   │   ├── useAuth.ts                    # Auth state & logic
│   │   │   ├── useDevices.ts                 # Device state & logic
│   │   │   ├── useWebSocket.ts               # WebSocket hook
│   │   │   ├── useErrors.ts                  # Error handling
│   │   │   └── usePushNotifications.ts       # Push notification setup
│   │   │
│   │   ├── context/
│   │   │   ├── AuthContext.tsx               # Auth provider
│   │   │   ├── DeviceContext.tsx             # Device provider
│   │   │   └── ErrorContext.tsx              # Error provider
│   │   │
│   │   ├── utils/
│   │   │   ├── api-client.ts                 # Axios instance with headers
│   │   │   ├── logger.ts                     # Logging utility
│   │   │   ├── storage.ts                    # AsyncStorage wrapper
│   │   │   ├── constants.ts                  # All constants
│   │   │   └── helpers.ts                    # Helper functions
│   │   │
│   │   ├── styles/
│   │   │   ├── theme.ts                      # Theme colors, spacing
│   │   │   ├── colors.ts                     # Color palette
│   │   │   └── spacing.ts                    # Spacing constants
│   │   │
│   │   └── navigation/
│   │       ├── RootNavigator.tsx             # Root navigation logic
│   │       ├── AuthNavigator.tsx             # Auth stack navigation
│   │       └── AppNavigator.tsx              # App stack navigation
│   │
│   ├── ios/
│   │   └── BeepMyDevice/                     # iOS project files
│   │
│   ├── android/
│   │   └── app/                              # Android project files
│   │
│   ├── __tests__/
│   │   ├── screens.test.tsx
│   │   ├── services.test.ts
│   │   └── hooks.test.ts
│   │
│   └── assets/
│       ├── images/
│       ├── icons/
│       └── fonts/
│
├── docs/
│   ├── README.md                             # Documentation index
│   ├── FEATURES.md                           # Complete feature list
│   ├── ARCHITECTURE.md                       # HLD + LLD
│   ├── API.md                                # API reference
│   ├── DEVELOPMENT.md                        # Development guide
│   ├── DEPLOYMENT.md                         # Deployment guide
│   ├── CODING_STANDARDS.md                   # Coding guidelines
│   ├── BeepMyDevice_Complete_Documentation.md # Full specification
│   ├── BeepMyDevice_Repository_Setup.md      # Repository setup
│   ├── WiFi_Alert_System_Specification.md    # Technical specs
│   └── BeepMyDevice_GitHub_Setup.md          # GitHub setup
│
├── .github/
│   ├── workflows/
│   │   ├── backend-tests.yml                 # CI: Python tests
│   │   ├── frontend-tests.yml                # CI: Node.js tests
│   │   └── deploy.yml                        # CD: Deploy workflow
│   │
│   └── ISSUE_TEMPLATE/
│       ├── bug_report.md
│       └── feature_request.md
│
└── .gitignore                                # Complete ignore rules
```

---

### 2. Documentation Placement

**Move/Copy these 4 existing documentation files into `/docs` folder:**

1. `BeepMyDevice_Complete_Documentation.md` → `/docs/`
2. `BeepMyDevice_Repository_Setup.md` → `/docs/`
3. `CODING_STANDARDS.md` → `/docs/`
4. `WiFi_Alert_System_Specification.md` → `/docs/`

These contain all the detailed specifications, architecture, and technical details.

---

### 3. README Files (Create in Each Folder)

#### Root `/README.md`
Include:
- Project overview (1-2 paragraphs)
- Problem & solution
- Key features (bulleted list)
- Tech stack table
- Project structure overview
- Quick start (backend + frontend sections)
- Documentation links
- Testing instructions
- Git workflow
- License info

#### `/backend/README.md`
Include:
- Quick start (venv → install → .env → run)
- Prerequisites (Python 3.11+, PostgreSQL, Redis optional)
- Project structure overview
- Technologies list
- Environment variables explanation
- API endpoints summary (with links to full docs)
- Testing instructions
- Coding standards reference
- Deployment guide
- Security info

#### `/frontend/README.md`
Include:
- Quick start (npm install → .env → run-ios/run-android)
- Prerequisites (Node.js 18+, Xcode, Android Studio)
- Project structure overview
- Technologies list
- Environment variables explanation
- Screens overview
- Components list
- Services/Hooks overview
- Testing instructions
- Build instructions (iOS + Android)

#### `/docs/README.md`
Include:
- Documentation index (list all guides)
- Quick links (to main guides)
- Getting started path (what to read first)
- FAQ section

---

### 4. Environment Variables (.env.example files)

#### `/backend/.env.example`
```
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/beepmydevice_dev

# JWT Authentication
SECRET_KEY=your-super-secret-key-change-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_DAYS=30

# Firebase (Android Push)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-key-id
FIREBASE_PRIVATE_KEY=your-private-key

# Apple APNs (iOS Push)
APPLE_TEAM_ID=your-team-id
APPLE_KEY_ID=your-key-id
APPLE_KEY_PATH=path/to/AuthKey_XXXXX.p8

# Server Configuration
SERVER_HOST=0.0.0.0
SERVER_PORT=8000
DEBUG=True
LOG_LEVEL=DEBUG

# CORS Configuration
CORS_ORIGINS=["http://localhost:3000", "http://localhost:8081"]

# Database Connection Pool
DB_POOL_SIZE=10
DB_POOL_TIMEOUT=30
DB_POOL_RECYCLE=3600
```

**Key point:** This is DIFFERENT from frontend .env. Database, JWT, Firebase, and APNs credentials go here.

#### `/frontend/.env.example`
```
# API Configuration
API_BASE_URL=http://localhost:8000
API_TIMEOUT=10000

# Firebase Configuration (Android Only)
FIREBASE_CONFIG_ANDROID={"apiKey": "...", "projectId": "...", ...}

# Apple Configuration (iOS)
APPLE_TEAM_ID=XXXXXXXXXX

# App Configuration
ENVIRONMENT=development
LOG_LEVEL=DEBUG
DEBUG_MODE=true
```

**Key point:** This is DIFFERENT from backend .env. API endpoint, Firebase mobile config, and environment mode go here.

---

### 5. Root Level Configuration Files

#### `.gitignore`
Comprehensive ignore rules for:
- Python: `__pycache__/`, `*.pyc`, `venv/`, `.pytest_cache/`, `.coverage`
- Node.js: `node_modules/`, `.expo/`, `Pods/`, `.gradle/`
- General: `.DS_Store`, `*.log`, `.env`, `.env.local`, `.idea/`
- Logs, builds, distributions, etc

#### `LICENSE`
MIT License with copyright notice

#### `package.json` (Frontend - Basic)
```json
{
  "name": "beepmydevice-app",
  "version": "1.0.0",
  "description": "WiFi-based device alert system",
  "main": "index.js",
  "scripts": {
    "start": "react-native start",
    "android": "react-native run-android",
    "ios": "react-native run-ios",
    "test": "jest",
    "lint": "eslint src/",
    "format": "prettier --write src/"
  }
}
```

#### `requirements.txt` (Backend - Basic)
```
fastapi==0.104.1
uvicorn==0.24.0
sqlalchemy==2.0.23
psycopg2-binary==2.9.9
pydantic==2.5.0
python-jose==3.3.0
passlib==1.7.4
bcrypt==4.1.1
python-dotenv==1.0.0
firebase-admin==6.2.0
pytest==7.4.3
```

---

## 6. Coding Standards & Development Rules

### SOLID Principles (Strict)
- **S**ingle Responsibility: Each class/function does ONE thing only
- **O**pen/Closed: Open for extension, closed for modification
- **L**iskov Substitution: Derived classes don't break base behavior
- **I**nterface Segregation: Depend on focused interfaces, not fat ones
- **D**ependency Injection: Inject dependencies, don't create internally

### Other Principles (Required)
- **DRY** (Don't Repeat Yourself): Extract common code to utilities/services
- **KISS** (Keep It Simple): Simple code > clever code (always)
- **YAGNI** (You Aren't Gonna Need It): Don't build features not needed yet

### Code Organization (Mandatory)
- Type hints on ALL functions (Python + TypeScript)
- No magic numbers (use constants in `constants.py` or `constants.ts`)
- Function size < 20 lines (split longer functions)
- Class size < 200 lines (split large classes)
- Clear naming: `user_id` not `u_id`, `get_device_by_id` not `gd`
- Comments only for WHY, not WHAT (code should be self-explanatory)

### Response Format (All APIs - Standardized)
```json
{
  "success": true/false,
  "status_code": 200,
  "data": {
    "content": [...items...],
    "pagination": {
      "current_page": 1,
      "total_pages": 5,
      "total_count": 100,
      "page_size": 20,
      "has_next": true,
      "has_prev": false
    }
  },
  "errors": [
    { "field": "email", "message": "...", "code": "VAL_003" }
  ],
  "correlation_id": "uuid-here",
  "timestamp": "2024-08-30T14:30:45.123Z"
}
```

### Error Handling (Strict)
- Errors returned as ARRAY (not single object)
- Multiple errors supported in one response
- Each error has: `field`, `message`, `code`
- Validation errors: `VAL_001`, `VAL_002`, etc
- Auth errors: `AUTH_001`, `AUTH_002`, etc
- Device errors: `DEVICE_001`, `DEVICE_002`, etc
- Never expose internal system details
- Always include `correlation_id` for tracing

### Logging Standards (Required)
- **DEBUG**: Variable values, function entry/exit, detailed flow (dev only)
- **INFO**: Important business events (login, device register, alert sent)
- **WARNING**: Unexpected but handled (device offline, push retry)
- **ERROR**: Failed operations (DB error, push failed, auth failed)
- **CRITICAL**: System breaking (DB connection lost, OOM)

**Log Format:**
```
[TIMESTAMP] [LEVEL] [CORRELATION_ID] [SERVICE] [MESSAGE]
2024-08-30T14:30:45.123Z INFO req-uuid device_service Device registered: device_id=xyz
```

### Correlation ID Flow (Mandatory)
1. Frontend generates UUID when user logs in (once per session)
2. Included in `X-Correlation-ID` header on EVERY API call
3. Backend extracts and passes through all services
4. Included in EVERY log message
5. Included in EVERY response
6. Used for request tracing across logs

### Database (PostgreSQL)
- UUID primary keys (not auto-increment IDs)
- Timestamps: `created_at`, `updated_at` (UTC)
- Foreign keys with CASCADE delete
- Proper indexes on frequently queried columns
- UTF-8 encoding

### Validation (Input)
- Validate at API boundary (routes)
- Pydantic schemas (backend) / TypeScript types (frontend)
- Field-specific error messages
- User-friendly messages (not internal jargon)
- Return all validation errors at once (not one at a time)

### Pagination (Standard)
- Default page size: 20 items
- Max page size: 100 items
- Query params: `?page=1&limit=20&sort=-created_at`
- Response includes: `current_page`, `total_pages`, `total_count`, `has_next`, `has_prev`
- Always inside `data.pagination`

### Authentication & Security
- Passwords hashed with bcrypt (never store plain text)
- JWT tokens with 30-day expiration
- HTTPS/TLS in production
- CORS configured (only allowed origins)
- SQL injection prevention (use ORM, parameterized queries)
- No credentials in logs or URLs
- Rate limiting (implement in Phase 2)

### Testing Requirements
- Unit tests for all services
- Integration tests for API endpoints
- Mock external services (Firebase, APNs)
- Minimum 70% code coverage target
- Tests run in CI/CD pipeline

### Git Workflow & Commits
- Branch naming: `feature/name`, `bugfix/name`, `docs/name`
- Commit format: `feat: description` or `fix: description`
- One logical change per commit
- Meaningful commit messages (not "wip" or "fix")
- Pull requests reviewed before merge

### Documentation (Inline)
- Python docstrings (Google style)
- TypeScript JSDoc comments
- Explain WHY code does something, not WHAT it does
- Keep docs updated with code changes
- README files kept current

### Performance Expectations
- API response time < 500ms (target)
- Database queries optimized with indexes
- No N+1 queries
- Lazy load data when possible
- Optimize payload sizes

---

## 7. Implementation Notes

### Senior Developer Expectations (20+ Years)
This codebase should reflect production-ready, enterprise-level standards:

1. **Architecture**: Clean separation of concerns, layered architecture
2. **Error Handling**: Comprehensive error handling, no silent failures
3. **Logging**: Extensive logging for debugging and monitoring
4. **Testing**: Unit tests, integration tests, fixtures
5. **Documentation**: Self-documenting code + explicit documentation
6. **Security**: Input validation, output encoding, secure defaults
7. **Performance**: Optimized queries, caching where appropriate
8. **Maintainability**: Easy to extend, easy to debug, easy to test
9. **Consistency**: Consistent patterns throughout codebase
10. **Best Practices**: Follow framework conventions and language idioms

### No "Script" Code
This isn't a quick prototype - it's a portfolio project that demonstrates:
- Professional architecture decisions
- Industry-standard patterns (DI, service layer, repository pattern)
- Proper error handling and logging
- Comprehensive testing
- Security best practices
- Clear documentation

### Code Review Mindset
Write code as if it will be reviewed by:
- Senior architects
- Security experts
- Performance engineers
- Future maintainers (yourself in 6 months)

---

## 8. Specific Tasks

### Create Empty Project Files (Skeleton Only)
I don't need actual implementation code yet - just the skeleton:
- Empty `__init__.py` files
- Empty service classes with docstrings (no implementation)
- Empty route files with stubs
- Empty component files with stubs

This allows me to understand the structure and plan implementation.

### Configuration & Setup Files (Full Content)
These should be complete:
- `config.py` - Configuration constants, environment loading
- `constants.py` - All magic numbers as named constants
- `.env.example` - Complete environment variable templates
- `logger.py` - Logging setup
- Database connection setup

### Documentation (Full Content)
- All README files (complete, detailed)
- `.gitignore` (complete)
- LICENSE (MIT)
- This brief document should be saved as project context

---

## Success Criteria

After you complete this setup, the project should have:

✅ Complete folder structure (all folders exist)  
✅ All documentation files in `/docs`  
✅ README files in root, `/backend`, `/frontend`, `/docs`  
✅ `.env.example` files (different for backend and frontend)  
✅ `.gitignore` with Python + Node.js rules  
✅ MIT License  
✅ Empty project skeleton (no code implementation yet)  
✅ Clear structure ready for 6-8 week development  
✅ Coding standards documented and enforced  
✅ Senior-level architecture demonstrated  

---

## Timeline

This setup should take 30-60 minutes. After this, the development phase begins with:

- Week 1-8: Implement backend + frontend according to specs
- Week 6-8: Testing and deployment preparation
- Week 9: Deploy to app stores

---

## Questions to Clarify

After you set this up, we can discuss:
- Specific implementation details
- Database schema refinement
- API endpoint details
- Frontend screen designs
- Testing strategy
- Deployment pipeline

---

**This is a real, professional project. Treat it as such.** 🚀

