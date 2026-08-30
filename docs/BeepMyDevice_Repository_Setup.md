# BeepMyDevice - Repository Setup Guide

## Repository Structure

### Main Repository
```
beepmydevice/
├── README.md
├── .gitignore
├── CONTRIBUTING.md
├── LICENSE
├── docs/
│   ├── FEATURES.md
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── DEVELOPMENT.md
│   └── DEPLOYMENT.md
│
├── backend/
│   ├── README.md
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── .env.example
│   ├── requirements.txt
│   ├── pyproject.toml
│   ├── setup.py
│   │
│   ├── src/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   │
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── device.py
│   │   │   ├── wifi_network.py
│   │   │   └── alert_log.py
│   │   │
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── device.py
│   │   │   └── alert.py
│   │   │
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── auth_service.py
│   │   │   ├── device_service.py
│   │   │   ├── alert_service.py
│   │   │   ├── notification_service.py
│   │   │   └── websocket_manager.py
│   │   │
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── devices.py
│   │   │   ├── alerts.py
│   │   │   └── websocket.py
│   │   │
│   │   ├── utils/
│   │   │   ├── __init__.py
│   │   │   ├── logger.py
│   │   │   ├── responses.py
│   │   │   ├── validators.py
│   │   │   └── constants.py
│   │   │
│   │   └── middleware/
│   │       ├── __init__.py
│   │       ├── auth_middleware.py
│   │       └── logging_middleware.py
│   │
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── test_auth.py
│   │   ├── test_devices.py
│   │   ├── test_alerts.py
│   │   └── conftest.py
│   │
│   ├── migrations/
│   │   └── versions/
│   │
│   └── scripts/
│       ├── init_db.py
│       └── seed_data.py
│
├── frontend/
│   ├── README.md
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   ├── app.json
│   ├── babel.config.js
│   ├── .eslintrc.json
│   │
│   ├── src/
│   │   ├── App.tsx
│   │   ├── index.js
│   │   ├── types/
│   │   │   ├── index.ts
│   │   │   ├── api.ts
│   │   │   ├── device.ts
│   │   │   └── user.ts
│   │   │
│   │   ├── screens/
│   │   │   ├── AuthStack/
│   │   │   │   ├── LoginScreen.tsx
│   │   │   │   ├── RegisterScreen.tsx
│   │   │   │   └── SplashScreen.tsx
│   │   │   │
│   │   │   └── AppStack/
│   │   │       ├── DashboardScreen.tsx
│   │   │       ├── DeviceDetailScreen.tsx
│   │   │       ├── SettingsScreen.tsx
│   │   │       └── ProfileScreen.tsx
│   │   │
│   │   ├── components/
│   │   │   ├── ErrorAlert.tsx
│   │   │   ├── DeviceCard.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   ├── BatteryIndicator.tsx
│   │   │   └── AlertModal.tsx
│   │   │
│   │   ├── services/
│   │   │   ├── api.ts
│   │   │   ├── auth.ts
│   │   │   ├── device.ts
│   │   │   ├── alert.ts
│   │   │   ├── notification.ts
│   │   │   └── websocket.ts
│   │   │
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useDevices.ts
│   │   │   ├── useWebSocket.ts
│   │   │   ├── useErrors.ts
│   │   │   └── usePushNotifications.ts
│   │   │
│   │   ├── context/
│   │   │   ├── AuthContext.tsx
│   │   │   ├── DeviceContext.tsx
│   │   │   └── ErrorContext.tsx
│   │   │
│   │   ├── utils/
│   │   │   ├── api-client.ts
│   │   │   ├── logger.ts
│   │   │   ├── storage.ts
│   │   │   ├── constants.ts
│   │   │   └── helpers.ts
│   │   │
│   │   ├── styles/
│   │   │   ├── theme.ts
│   │   │   ├── colors.ts
│   │   │   └── spacing.ts
│   │   │
│   │   └── navigation/
│   │       ├── RootNavigator.tsx
│   │       ├── AuthNavigator.tsx
│   │       └── AppNavigator.tsx
│   │
│   ├── ios/
│   │   ├── BeepMyDevice/
│   │   └── BeepMyDevice.xcodeproj/
│   │
│   ├── android/
│   │   ├── app/
│   │   └── build.gradle
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
└── .github/
    ├── workflows/
    │   ├── backend-tests.yml
    │   ├── frontend-tests.yml
    │   └── deploy.yml
    │
    └── ISSUE_TEMPLATE/
        ├── bug_report.md
        └── feature_request.md
```

---

## Git Setup

### .gitignore (Root Level)
```
# Backend
backend/.env
backend/.env.local
backend/__pycache__/
backend/*.pyc
backend/venv/
backend/.vscode/
backend/.pytest_cache/

# Frontend
frontend/node_modules/
frontend/.env
frontend/.env.local
frontend/.expo/
frontend/ios/Pods/
frontend/ios/Podfile.lock
frontend/android/.gradle/
frontend/android/build/

# General
.DS_Store
*.log
.idea/
*.swp
*.swo
build/
dist/
.env.local
```

### Initial Repository Commands
```bash
# Create main repository
mkdir beepmydevice
cd beepmydevice
git init
git branch -M main

# Create subdirectories
mkdir backend frontend docs

# Initialize git subcommands
git add .
git commit -m "Initial project structure"

# Add remote
git remote add origin https://github.com/yourusername/beepmydevice.git
git push -u origin main
```

---

## Backend Setup

### requirements.txt
```
fastapi==0.104.1
uvicorn==0.24.0
sqlalchemy==2.0.23
psycopg2-binary==2.9.9
pydantic==2.5.0
pydantic-settings==2.1.0
python-jose==3.3.0
passlib==1.7.4
bcrypt==4.1.1
python-dotenv==1.0.0
firebase-admin==6.2.0
aioredis==2.0.1
python-multipart==0.0.6
pytest==7.4.3
pytest-asyncio==0.21.1
alembic==1.13.0
```

### .env.example (Backend)
```
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/beepmydevice

# JWT
SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_DAYS=30

# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-key-id
FIREBASE_PRIVATE_KEY=your-private-key

# Apple APNs
APPLE_TEAM_ID=your-team-id
APPLE_KEY_ID=your-key-id
APPLE_KEY_PATH=path/to/key.p8

# Server
SERVER_HOST=0.0.0.0
SERVER_PORT=8000
DEBUG=False
LOG_LEVEL=INFO

# CORS
CORS_ORIGINS=["http://localhost:3000", "https://beepmydevice.com"]
```

### config.py (Backend)
```python
# Database: postgresql://user:password@host:port/dbname
# JWT: 30-day expiration
# Push notifications: Firebase + APNs configured
# CORS: Localhost for dev, beepmydevice.com for prod
# Logging: DEBUG/INFO/WARNING/ERROR/CRITICAL
# Constants: MAX_PAGE_SIZE=100, DEFAULT_PAGE_SIZE=20
```

---

## Frontend Setup

### package.json Scripts
```json
{
  "scripts": {
    "start": "react-native start",
    "android": "react-native run-android",
    "ios": "react-native run-ios",
    "test": "jest",
    "lint": "eslint src/",
    "format": "prettier --write src/",
    "build:android": "cd android && ./gradlew assembleRelease",
    "build:ios": "cd ios && xcodebuild -scheme BeepMyDevice -configuration Release"
  }
}
```

### .env.example (Frontend)
```
API_BASE_URL=http://localhost:8000
API_TIMEOUT=10000
FIREBASE_CONFIG_ANDROID={"...": "..."}
APPLE_TEAM_ID=your-team-id
LOG_LEVEL=INFO
ENVIRONMENT=development
```

---

## Database Setup

### Initial Schema
```sql
-- Users
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- WiFi Networks
CREATE TABLE wifi_networks (
    wifi_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    network_name VARCHAR(255),
    mac_address VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Devices
CREATE TABLE devices (
    device_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    wifi_id UUID NOT NULL REFERENCES wifi_networks(wifi_id) ON DELETE CASCADE,
    device_name VARCHAR(255),
    device_type VARCHAR(50),
    device_os_version VARCHAR(50),
    push_token VARCHAR(500),
    battery_level INT,
    status VARCHAR(50) DEFAULT 'OFFLINE',
    last_heartbeat TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Alert Logs
CREATE TABLE alert_logs (
    alert_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_user_id UUID NOT NULL REFERENCES users(user_id),
    wifi_id UUID NOT NULL REFERENCES wifi_networks(wifi_id),
    target_devices TEXT[],
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_devices_user_id ON devices(user_id);
CREATE INDEX idx_devices_wifi_id ON devices(wifi_id);
CREATE INDEX idx_alert_logs_sender ON alert_logs(sender_user_id);
```

---

## Claude Skills Setup

### Backend Skill (Claude Code)
```
Name: beepmydevice-backend
Description: Python FastAPI backend for BeepMyDevice WiFi alert system
Location: /workspace/beepmydevice/backend
Commands:
  - Start dev server: uvicorn src.main:app --reload
  - Run tests: pytest
  - Check code: pylint src/
  - Format: black src/
```

### Frontend Skill (Claude Code)
```
Name: beepmydevice-frontend
Description: React Native frontend for BeepMyDevice WiFi alert system
Location: /workspace/beepmydevice/frontend
Commands:
  - Start bundler: npm start
  - Run iOS: npm run ios
  - Run Android: npm run android
  - Run tests: npm test
  - Lint: npm run lint
```

---

## Development Workflow

### Daily Workflow
1. Pull latest: `git pull origin main`
2. Create feature branch: `git checkout -b feature/feature-name`
3. Make changes
4. Test locally
5. Commit: `git commit -m "feat: description"`
6. Push: `git push origin feature/feature-name`
7. Create pull request

### Commit Message Format
```
feat: Add new feature
fix: Fix bug
docs: Update documentation
style: Code style changes
refactor: Refactor code
test: Add tests
chore: Maintenance
```

### Branch Naming
```
feature/device-grouping
bugfix/alert-not-sending
docs/api-documentation
hotfix/critical-bug
```

---

## Local Development Setup

### Step 1: Clone Repository
```bash
git clone https://github.com/yourusername/beepmydevice.git
cd beepmydevice
```

### Step 2: Setup Backend
```bash
cd backend
python -m venv venv

# On macOS/Linux
source venv/bin/activate

# On Windows
venv\Scripts\activate

pip install -r requirements.txt
cp .env.example .env
# Edit .env with your values
python -m alembic upgrade head
uvicorn src.main:app --reload
```

### Step 3: Setup Frontend
```bash
cd ../frontend
npm install
npx react-native run-ios  # or run-android
```

### Step 4: Verify Setup
- Backend: http://localhost:8000/docs (Swagger UI)
- Frontend: App running on simulator/device
- Database: PostgreSQL running locally

---

## Testing

### Backend Tests
```bash
cd backend
pytest
pytest --cov=src  # With coverage
pytest -v  # Verbose
```

### Frontend Tests
```bash
cd frontend
npm test
npm test -- --coverage
```

---

## Documentation Standards

### Docstring Format (Python)
```python
def function_name(param1: str, param2: int) -> bool:
    """
    Brief description.
    
    Longer description if needed.
    
    Args:
        param1: Description of param1
        param2: Description of param2
    
    Returns:
        Description of return value
    
    Raises:
        ValueError: When value is invalid
    """
```

### TypeScript JSDoc Format
```typescript
/**
 * Brief description.
 * 
 * Longer description if needed.
 * 
 * @param param1 - Description
 * @param param2 - Description
 * @returns Description of return value
 * @throws Error when something fails
 */
function functionName(param1: string, param2: number): boolean {
}
```

---

## Deployment

### Backend Deployment
```bash
# Build Docker image
docker build -t beepmydevice-backend:latest .

# Push to registry
docker push your-registry/beepmydevice-backend:latest

# Deploy to server
docker-compose up -d
```

### Frontend Deployment
```bash
# iOS App Store
cd ios
xcodebuild -scheme BeepMyDevice -configuration Release
# Upload via Xcode/App Store Connect

# Google Play
cd android
./gradlew assembleRelease
# Upload via Google Play Console
```

---

**End of Repository Setup Guide**

Version: 1.0  
Last Updated: 2024-08-30
