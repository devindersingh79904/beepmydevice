# BeepMyDevice - Complete Project Documentation

**Project Name:** BeepMyDevice  
**Domain:** beepmydevice.com  
**Tagline:** Find & Alert Your Devices at Home  
**Type:** Personal Project / Portfolio  
**Timeline:** Phase 1 - 6-8 weeks  
**Status:** Planning → Development

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Coding Guidelines](#coding-guidelines)
5. [HLD - High Level Design](#hld---high-level-design)
6. [LLD - Low Level Design](#lld---low-level-design)
7. [Database Schema](#database-schema)
8. [API Specifications](#api-specifications)
9. [Folder Structure](#folder-structure)
10. [Implementation Phases](#implementation-phases)

---

## Project Overview

### Problem
Multiple devices at home (iOS, Android, Mac, Windows) with different accounts (multiple Apple IDs, Google accounts). Existing solutions (Apple Find My, Google Find My Device) require same account per ecosystem.

### Solution
BeepMyDevice - WiFi-based device finder that works across different accounts on the same home WiFi network.

### Unique Value
- Works across ANY accounts on SAME WiFi (Apple Find My doesn't)
- Cross-platform (iOS, Android, Mac, Windows)
- Admin-controlled (secure, only authorized person triggers alerts)
- Cloud-based (no hub device needed at home)
- Privacy-focused (alerts only within same WiFi)

### Target Users
- Multi-user households (families with multiple iPhones)
- Roommates with different accounts
- Small offices
- Personal use (LinkedIn portfolio project)

---

## Features

### Phase 1 - MVP (6-8 weeks)

#### 1.1 Authentication System
- User registration (email + password)
- User login (email + password)
- JWT token generation (30-day expiration)
- Token validation on all endpoints
- Logout functionality
- Password hashing (bcrypt)

#### 1.2 Device Management
- Device registration (when app first opens)
- Detect device type (iOS, Android, Windows, macOS)
- Get push notification tokens (Firebase + APNs)
- Get WiFi MAC address (device's current network)
- Store device info in database
- Remove device from system
- Update device status (heartbeat every 30 seconds)
- Battery level tracking
- Device list view for admin

#### 1.3 Alert System
- Send alert to all devices on same WiFi
- Verify admin authorization
- Check all devices on same WiFi (MAC validation)
- Route alert via Firebase/APNs
- Sound + vibration on receiving device
- Alert history/logging
- Alert status tracking (sent/received/failed)

#### 1.4 Real-Time Status
- WebSocket connection for live updates
- Device online/offline status
- Battery level updates
- Last seen timestamp
- Connection state monitoring

#### 1.5 Frontend Screens
- Login/Register screen
- Dashboard (device list + send alerts)
- Device detail screen
- Settings screen
- Error display (auto-close 5 seconds)
- Real-time status indicators

#### 1.6 Push Notifications
- Android: Firebase Cloud Messaging setup
- iOS: Apple Push Notification service setup
- Handle notification permissions
- Retry logic for failed notifications
- Notification token refresh

### Phase 2 - Device Grouping (Future)
- Admin can create device groups
- Select specific group to alert
- Family/room-based grouping

### Phase 3 - Advanced Features (Future)
- WiFi network scanning (show unknown devices)
- Multi-admin support
- Custom alert sounds
- Device location (GPS)
- Alert statistics

---

## Tech Stack

### Backend
```
Language: Python 3.11+
Framework: FastAPI (async, WebSocket support)
Server: Uvicorn (ASGI)
ORM: SQLAlchemy 2.0+
Database: PostgreSQL 12+
Authentication: PyJWT, bcrypt
Validation: Pydantic
WebSocket: fastapi-websockets
Logging: Python logging (built-in)
Push Notifications:
  ├─ firebase-admin (Firebase Cloud Messaging)
  └─ APNs (Apple Push Notification service)
Environment: python-dotenv
```

### Frontend
```
Framework: React Native
Language: TypeScript
Navigation: React Navigation v6+
State Management: React Context API
HTTP Client: axios
Local Storage: AsyncStorage
Push Notifications:
  ├─ react-native-push-notification
  ├─ @react-native-firebase/messaging (Android)
  └─ Built-in iOS push handling
UI: React Native native components
Icons: react-native-vector-icons
```

### Database
```
System: PostgreSQL 12+
Connection Pool: PgBouncer (production)
Backup: Automated daily
Timezone: UTC
Encoding: UTF-8
```

### Infrastructure
```
Hosting: devinderpansar.com (existing)
Web Server: Nginx (reverse proxy)
ASGI Server: Uvicorn
Certificates: SSL/TLS (Let's Encrypt)
Domain: beepmydevice.com
Monitoring: Basic logging
```

### External Services
```
Firebase:
  ├─ Project: beepmydevice
  ├─ Cloud Messaging: Enabled
  └─ Admin SDK: Configured

Apple Developer:
  ├─ Developer Account (needed)
  ├─ APNs Certificate (.p8 key)
  └─ Provisioning Profiles
```

---

## Coding Guidelines

### SOLID Principles
- **S**ingle Responsibility: Each class does ONE thing
- **O**pen/Closed: Open for extension, closed for modification
- **L**iskov Substitution: Derived classes don't break base behavior
- **I**nterface Segregation: Small, focused interfaces
- **D**ependency Injection: Pass dependencies, don't create them

### Other Principles
- **DRY** (Don't Repeat Yourself): Extract common code
- **KISS** (Keep It Simple): Simple > Clever
- **YAGNI** (You Aren't Gonna Need It): No premature features
- **Type Hints**: All functions (Python)
- **No Magic Numbers**: Use constants
- **Clear Naming**: `user_id`, not `u_id`
- **Function Size**: < 20 lines
- **Class Size**: < 200 lines

### Response Format
All API responses follow standard format:
```json
{
  "success": true/false,
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

### Error Handling
- Catch specific exceptions first
- Always log with full stack trace (exc_info=True)
- Return error code + user-friendly message
- Never expose internal details
- Multiple errors returned as array

### Logging Standards
- **DEBUG**: Variable values, function flow
- **INFO**: User actions, important events
- **WARNING**: Unexpected but handled
- **ERROR**: Failed operations
- **CRITICAL**: System breaking
- **Format**: [TIMESTAMP] [LEVEL] [CORRELATION_ID] [SERVICE] [MESSAGE]

### Correlation ID Flow
- Frontend generates UUID per session
- Included in X-Correlation-ID header
- Backend passes through all services
- Used for request tracing in logs

### Validation
- Validate at API boundary
- Return field-specific errors
- Error codes (VAL_001, VAL_002, etc)
- User-friendly messages

### Pagination
- Default: 20 items per page
- Maximum: 100 items per page
- Fields: current_page, total_pages, total_count, has_next, has_prev
- Inside data.pagination

---

## HLD - High Level Design

### System Architecture

```
┌─────────────────────────────────────────────────┐
│         Frontend (React Native)                  │
├──────────────────────────────────────────────────┤
│ iOS App  │ Android App  │ Mac App  │ Windows App │
└────────────┬────────────┬──────────┬────────────┘
             │ HTTP + WS  │
             ▼
┌─────────────────────────────────────────────────┐
│      Backend API (Python + FastAPI)              │
├──────────────────────────────────────────────────┤
│  • Authentication Service                        │
│  • Device Service                                │
│  • Alert Service                                 │
│  • Notification Service                          │
│  • WebSocket Manager                             │
└────────────┬────────────┬──────────┬────────────┘
             │            │          │
    ┌────────▼───┐ ┌──────▼─┐  ┌───▼─────────┐
    │ PostgreSQL │ │Firebase│  │ APNs        │
    │ Database   │ │ Cloud  │  │ (Apple)     │
    │            │ │ Msg    │  │             │
    └────────────┘ └────────┘  └─────────────┘
```

### Request Flow

#### Login Flow
```
Frontend → Enter credentials
        → POST /auth/login
        → Backend: Hash & compare password
        → Generate JWT token
        → Return token
        → Frontend: Store token locally
```

#### Device Registration Flow
```
App Opens → Detect WiFi network
         → Get push token (Firebase/APNs)
         → POST /devices/register
         → Backend: Create device record
         → Store push token
         → Return device_id
```

#### Send Alert Flow
```
Admin opens app → Click device
              → POST /alerts/send
              → Backend: Verify admin
              → Check: Same WiFi? Yes
              → Get device push token
              → Send via Firebase/APNs
              → Devices receive notification
              → Beep + vibrate
```

#### Real-Time Status Flow
```
Frontend → Connect WebSocket
        → Backend: Authenticate
        → Device sends heartbeat (every 30s)
        → Backend updates status
        → Broadcasts to admin via WebSocket
        → Admin sees real-time update
```

### Security

#### Authentication
- Email/password registration
- bcrypt password hashing
- JWT token (30-day expiration)
- Token included in every request header

#### Authorization
- Verify user owns device before alert
- Check device on same WiFi
- Only admin can trigger alerts
- Guest access: auto-registers with no login, receives alerts, cannot send,
  cannot list devices (see docs/ARCHITECTURE.md - Guest access)

#### Data Protection
- HTTPS/TLS for all communication
- Passwords never logged
- Tokens in Authorization header
- No sensitive data in URLs

---

## LLD - Low Level Design

### Service Layer Architecture

#### AuthService
```
Methods:
  - register(email, password) → user_id
  - login(email, password) → token
  - verify_token(token) → user_id
  - logout(token) → bool
  - hash_password(password) → hash
  - verify_password(password, hash) → bool
```

#### DeviceService
```
Methods:
  - register_device(user_id, device_info) → device_id
  - get_devices(user_id, wifi_id) → List[Device]
  - get_device(device_id) → Device
  - update_heartbeat(device_id, battery, wifi_mac) → bool
  - set_offline(device_id) → bool
  - remove_device(device_id) → bool
  - get_device_status(device_id) → status
```

#### AlertService
```
Methods:
  - send_alert(admin_user_id, device_ids) → alert_id
  - verify_admin(user_id, wifi_id) → bool
  - verify_same_wifi(device_ids) → bool
  - get_alert_logs(user_id, limit, page) → List[Alert]
  - log_alert(alert_id, devices, status) → bool
```

#### NotificationService
```
Methods:
  - send_firebase_message(push_token, title, body) → bool
  - send_apns_message(push_token, title, body) → bool
  - handle_notification_failure(device_id) → bool
  - refresh_token(device_id, new_token) → bool
```

#### WebSocketManager
```
Methods:
  - connect(client_id, auth_token) → bool
  - broadcast_device_status(device_id, status) → bool
  - broadcast_battery_update(device_id, battery) → bool
  - disconnect(client_id) → bool
  - get_connected_clients() → List[client_id]
```

### API Endpoints

#### Authentication
```
POST /auth/register
  Input: email, password
  Output: user_id, token

POST /auth/login
  Input: email, password
  Output: user_id, token, user_info

POST /auth/logout
  Headers: Authorization
  Output: success
```

#### Devices
```
POST /devices/register
  Headers: Authorization, X-Correlation-ID
  Input: device_name, device_type, push_token, wifi_mac
  Output: device_id

GET /devices/list
  Headers: Authorization, X-Correlation-ID
  Query: page, limit
  Output: devices[], pagination

GET /devices/{device_id}
  Headers: Authorization, X-Correlation-ID
  Output: device details

PUT /devices/{device_id}/heartbeat
  Headers: Authorization, X-Correlation-ID
  Input: battery_level, wifi_mac
  Output: success

DELETE /devices/{device_id}
  Headers: Authorization, X-Correlation-ID
  Output: success
```

#### Alerts
```
POST /alerts/send
  Headers: Authorization, X-Correlation-ID
  Input: device_ids[] (or empty for all)
  Output: alert_id, delivery_status

GET /alerts/logs
  Headers: Authorization, X-Correlation-ID
  Query: page, limit
  Output: alerts[], pagination
```

#### WebSocket
```
ws://beepmydevice.com/ws/status
  Connect: Send Authorization token
  Listen: 
    { device_id, status, battery, timestamp }
  Disconnect: On logout
```

---

## Database Schema

### Users Table
```
user_id (UUID, PK)
email (VARCHAR, UNIQUE)
password_hash (VARCHAR)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

### WiFi Networks Table
```
wifi_id (UUID, PK)
user_id (UUID, FK → users)
network_name (VARCHAR)
mac_address (VARCHAR, UNIQUE)
created_at (TIMESTAMP)
```

### Devices Table
```
device_id (UUID, PK)
user_id (UUID, FK → users)
wifi_id (UUID, FK → wifi_networks)
device_name (VARCHAR)
device_type (VARCHAR: ios, android, windows, macos)
device_os_version (VARCHAR)
push_token (VARCHAR)
battery_level (INT)
status (VARCHAR: ONLINE, OFFLINE)
last_heartbeat (TIMESTAMP)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

### Alert Logs Table
```
alert_id (UUID, PK)
sender_user_id (UUID, FK → users)
wifi_id (UUID, FK → wifi_networks)
target_devices (TEXT[])
status (VARCHAR: SENT, RECEIVED, FAILED)
created_at (TIMESTAMP)
```

---

## API Specifications

### Request Headers (All Endpoints)
```
Authorization: Bearer {token}
X-Correlation-ID: {uuid}
Content-Type: application/json
```

### Success Response Format
```json
{
  "success": true,
  "status_code": 200,
  "data": {
    "content": [...],
    "pagination": {
      "current_page": 1,
      "total_pages": 5,
      "total_count": 100,
      "page_size": 20,
      "has_next": true,
      "has_prev": false
    }
  },
  "correlation_id": "req-uuid",
  "timestamp": "2024-08-30T14:30:45.123Z",
  "message": "Success message"
}
```

### Error Response Format
```json
{
  "success": false,
  "status_code": 400,
  "data": null,
  "errors": [
    {
      "field": "email",
      "message": "Invalid format",
      "code": "VAL_003"
    }
  ],
  "correlation_id": "req-uuid",
  "timestamp": "2024-08-30T14:30:45.123Z"
}
```

### Error Codes
```
Authentication:
  AUTH_001: Invalid credentials
  AUTH_002: Token expired
  AUTH_003: Token invalid
  AUTH_004: Unauthorized

Device:
  DEVICE_001: Device not found
  DEVICE_002: Device offline
  DEVICE_003: Invalid device type
  DEVICE_004: Device already registered

Alert:
  ALERT_001: Different WiFi networks
  ALERT_002: No target devices
  ALERT_003: Permission denied
  ALERT_004: Push notification failed

Validation:
  VAL_001: Missing required field
  VAL_002: Invalid field format
  VAL_003: Invalid email format
  VAL_004: Password too weak
```

---

## Folder Structure

### Backend (Python + FastAPI)
```
beepmydevice-backend/
├── src/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app entry
│   ├── config.py               # Config & constants
│   ├── database.py             # PostgreSQL connection
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── device.py
│   │   ├── wifi_network.py
│   │   └── alert_log.py
│   │
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── device.py
│   │   └── alert.py
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── auth_service.py
│   │   ├── device_service.py
│   │   ├── alert_service.py
│   │   ├── notification_service.py
│   │   └── websocket_manager.py
│   │
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── devices.py
│   │   ├── alerts.py
│   │   └── websocket.py
│   │
│   ├── utils/
│   │   ├── __init__.py
│   │   ├── logger.py
│   │   ├── responses.py
│   │   └── validators.py
│   │
│   └── middleware/
│       ├── __init__.py
│       ├── auth_middleware.py
│       └── logging_middleware.py
│
├── tests/
│   ├── __init__.py
│   ├── test_auth.py
│   ├── test_devices.py
│   └── test_alerts.py
│
├── migrations/
│   └── versions/
│
├── .env.example
├── requirements.txt
├── docker-compose.yml
├── Dockerfile
├── pyproject.toml
└── README.md
```

### Frontend (React Native)
```
beepmydevice-app/
├── src/
│   ├── App.tsx
│   ├── index.js
│   │
│   ├── screens/
│   │   ├── AuthStack/
│   │   │   ├── LoginScreen.tsx
│   │   │   └── RegisterScreen.tsx
│   │   │
│   │   ├── AppStack/
│   │   │   ├── DashboardScreen.tsx
│   │   │   ├── DeviceDetailScreen.tsx
│   │   │   └── SettingsScreen.tsx
│   │   │
│   │   └── SplashScreen.tsx
│   │
│   ├── components/
│   │   ├── ErrorAlert.tsx
│   │   ├── DeviceCard.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── StatusIndicator.tsx
│   │
│   ├── services/
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   ├── device.ts
│   │   ├── alert.ts
│   │   └── notification.ts
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useDevices.ts
│   │   ├── useWebSocket.ts
│   │   └── useErrors.ts
│   │
│   ├── context/
│   │   ├── AuthContext.tsx
│   │   └── DeviceContext.tsx
│   │
│   ├── utils/
│   │   ├── api-client.ts
│   │   ├── logger.ts
│   │   └── storage.ts
│   │
│   ├── types/
│   │   ├── index.ts
│   │   ├── api.ts
│   │   └── device.ts
│   │
│   └── styles/
│       └── theme.ts
│
├── ios/
│   └── BeepMyDevice/
│
├── android/
│   └── app/
│
├── .env.example
├── package.json
├── tsconfig.json
├── app.json
└── README.md
```

---

## Implementation Phases

### Phase 1 - MVP (Weeks 1-8)

**Week 1-2: Backend Setup**
- [ ] FastAPI project structure
- [ ] PostgreSQL setup
- [ ] User auth system
- [ ] JWT token generation

**Week 2-3: Device Management**
- [ ] Device registration
- [ ] Heartbeat mechanism
- [ ] Status tracking
- [ ] WebSocket setup

**Week 3-4: Alert System**
- [ ] Alert logic
- [ ] Firebase setup
- [ ] APNs setup
- [ ] Push integration

**Week 4-5: React Native App**
- [ ] Project setup (all platforms)
- [ ] Auth screens
- [ ] Dashboard screen
- [ ] WebSocket integration

**Week 5-6: Frontend Features**
- [ ] Send alert
- [ ] Real-time updates
- [ ] Settings
- [ ] Error handling

**Week 6-8: Testing & Deploy**
- [ ] E2E testing
- [ ] Device testing (iOS, Android, Mac, Windows)
- [ ] Deploy to production
- [ ] App store prep

### Phase 2 - Device Grouping (Future)
- Device groups
- Selective alerts
- Family grouping

### Phase 3 - Advanced (Future)
- WiFi scanning
- Multi-admin
- Custom sounds
- Statistics

---

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 12+
- Apple Developer Account (iOS)
- Google Firebase Account (Android)

### Setup Backend
```bash
cd beepmydevice-backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python -m alembic upgrade head
uvicorn src.main:app --reload
```

### Setup Frontend
```bash
cd beepmydevice-app
npm install
npx react-native run-ios   # iOS
npx react-native run-android  # Android
```

---

## Documentation Links

- **Specification:** WiFi_Alert_System_Specification.md
- **Coding Standards:** CODING_STANDARDS.md
- **API Documentation:** (Generated by FastAPI /docs)

---

**End of Documentation**

Version: 1.0  
Last Updated: 2024-08-30  
Status: Ready for Development
