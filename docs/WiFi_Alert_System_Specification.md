# WiFi Device Alert System - Complete Specification

## 📋 Project Overview

**Name:** WiFi Device Alert System  
**Purpose:** Find and alert own devices connected to same home WiFi (cross-account)  
**Target Users:** Personal project (single home)  
**Timeline:** Phase 1 - 6-8 weeks  
**Tech Stack:** Python (Backend), React Native (Frontend), PostgreSQL (Database)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│           Cloud Server (devinderpansar.com)                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Python Backend (Flask/FastAPI)                     │    │
│  ├─ Authentication Service                             │    │
│  ├─ Device Registry Service                            │    │
│  ├─ Alert Router Service                               │    │
│  ├─ WebSocket Handler (Real-time status)              │    │
│  └─ Push Notification Handler                          │    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Database (PostgreSQL)                              │    │
│  ├─ Users table                                         │    │
│  ├─ Devices table                                       │    │
│  ├─ WiFi Networks table                                │    │
│  └─ Alert Logs table                                   │    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Services                                            │    │
│  ├─ Firebase Admin SDK (Android push)                 │    │
│  └─ Apple APNs Integration (iOS push)                 │    │
└─────────────────────────────────────────────────────────────┘
         ↑                                        ↑
         │ HTTP + WebSocket                       │ Push Notification
         │ (Commands + Status)                    │
         ↓                                        ↓
┌─────────────────────────────────────────────────────────────┐
│           Client Apps (React Native)                        │
├──────────────────────────────────────────────────────────────┤
│ iOS (iPhone, iPad)  │ Android  │ Windows  │ macOS           │
│                                                              │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
│ │ Auth Screen  │ │ Dashboard    │ │ Settings     │         │
│ ├──────────────┤ ├──────────────┤ ├──────────────┤         │
│ │ Login/Signup │ │ Device List  │ │ Device Mgmt  │         │
│ └──────────────┘ │ Send Alert   │ │ Logout       │         │
│                  │ Real-time    │ └──────────────┘         │
│                  │ Status       │                           │
│                  └──────────────┘                           │
└─────────────────────────────────────────────────────────────┘
       All on Same WiFi (192.168.x.x)
```

---

## 🛢️ Database Schema

### Users Table
```sql
CREATE TABLE users (
    user_id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### WiFi Networks Table
```sql
CREATE TABLE wifi_networks (
    wifi_id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id),
    network_name VARCHAR(255),
    mac_address VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Devices Table
```sql
CREATE TABLE devices (
    device_id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id),
    wifi_id UUID NOT NULL REFERENCES wifi_networks(wifi_id),
    device_name VARCHAR(255),
    device_type VARCHAR(50), -- "ios", "android", "windows", "macos"
    device_os_version VARCHAR(50),
    push_token VARCHAR(500), -- Firebase or APNs token
    battery_level INT,
    status VARCHAR(50), -- "ONLINE", "OFFLINE"
    last_heartbeat TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Alert Logs Table
```sql
CREATE TABLE alert_logs (
    alert_id UUID PRIMARY KEY,
    sender_user_id UUID NOT NULL REFERENCES users(user_id),
    wifi_id UUID NOT NULL REFERENCES wifi_networks(wifi_id),
    target_devices TEXT[], -- Array of device IDs
    status VARCHAR(50), -- "SENT", "RECEIVED", "FAILED"
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔌 API Endpoints

### Authentication
```
POST /auth/register
├─ Email, password
└─ Returns: user_id, token

POST /auth/login
├─ Email, password
└─ Returns: user_id, token, user_info

POST /auth/logout
└─ Invalidates token
```

### Devices
```
POST /devices/register
├─ device_name, device_type, push_token, wifi_mac
└─ Returns: device_id

GET /devices/list
├─ Headers: Authorization token
└─ Returns: All devices for this wifi + status

PUT /devices/{device_id}/heartbeat
├─ battery_level, wifi_mac
└─ Updates: status to ONLINE, last_heartbeat

DELETE /devices/{device_id}
└─ Removes device from system
```

### Alerts
```
POST /alerts/send
├─ device_ids[] (or empty for all on same wifi)
├─ Headers: Authorization token
└─ Returns: alert_id, delivery_status

GET /alerts/logs
├─ Headers: Authorization token
└─ Returns: List of past alerts (for debugging)
```

### WebSocket (Real-time Status)
```
ws://devinderpansar.com/ws/status
├─ On connect: Send auth token
├─ Listen: Device status updates
│  └─ { device_id, status, battery, timestamp }
└─ Auto-disconnect on logout
```

---

## 📱 Frontend Screens (React Native)

### 1. Auth Screen
```
┌─────────────────────────┐
│   WiFi Alert System     │
├─────────────────────────┤
│                         │
│  Email: [_____________] │
│  Password: [___________] │
│                         │
│  [Login Button]         │
│  [Sign Up]              │
│                         │
└─────────────────────────┘
```

### 2. Dashboard (Main Screen)
```
┌─────────────────────────┐
│ Home WiFi               │
│ Connected: 4 devices    │
├─────────────────────────┤
│                         │
│ 📱 iPhone 17 Pro        │
│    Battery: 85% 🟢      │
│    Status: ONLINE       │
│    [Send Alert]         │
│                         │
│ 📱 Samsung S24          │
│    Battery: 45% 🟡      │
│    Status: ONLINE       │
│    [Send Alert]         │
│                         │
│ 🖥️  MacBook             │
│    Status: ONLINE 🟢    │
│    [Send Alert]         │
│                         │
│ 📱 iPad                 │
│    Status: OFFLINE 🔴   │
│    [Send Alert - disabled]
│                         │
├─────────────────────────┤
│ [Settings] [Logout]     │
└─────────────────────────┘
```

### 3. Alert Confirmation
```
┌─────────────────────────┐
│ Send Alert?             │
├─────────────────────────┤
│                         │
│ Target: Samsung S24     │
│ Battery: 45%            │
│ WiFi: Home-WiFi ✅      │
│                         │
│ [Cancel] [Send Alert]   │
│                         │
└─────────────────────────┘
```

### 4. Settings Screen
```
┌─────────────────────────┐
│ Settings                │
├─────────────────────────┤
│                         │
│ Account                 │
│ ├─ Email: dev@...       │
│ └─ Change Password      │
│                         │
│ WiFi Network            │
│ ├─ Network: Home-WiFi   │
│ └─ MAC: 00:1A:2B...     │
│                         │
│ Device Management       │
│ └─ Manage devices       │
│                         │
│ [Logout]                │
│                         │
└─────────────────────────┘
```

---

## ⚙️ Backend Services (Python)

### 1. Authentication Service
```python
# auth_service.py
class AuthService:
    def register(email, password) -> user_id
    def login(email, password) -> token
    def verify_token(token) -> user_id
    def logout(token) -> bool
```

### 2. Device Registry Service
```python
# device_service.py
class DeviceService:
    def register_device(user_id, device_info) -> device_id
    def get_devices(user_id, wifi_id) -> List[Device]
    def update_heartbeat(device_id, battery, wifi_mac) -> bool
    def set_offline(device_id) -> bool
    def remove_device(device_id) -> bool
```

### 3. Alert Router Service
```python
# alert_service.py
class AlertService:
    def send_alert(admin_user_id, target_devices) -> alert_id
        # 1. Verify admin is user
        # 2. Check all devices on same WiFi
        # 3. Send via Firebase/APNs
        # 4. Log alert
    
    def get_alert_logs(user_id) -> List[Alert]
```

### 4. Push Notification Service
```python
# notification_service.py
class NotificationService:
    def send_firebase_message(push_token, title, body) -> bool
    def send_apns_message(push_token, title, body) -> bool
    def handle_notification_failure(device_id) -> bool
```

### 5. WebSocket Manager
```python
# websocket_manager.py
class WebSocketManager:
    def connect(client_id, auth_token) -> bool
    def broadcast_status_update(device_id, status) -> bool
    def disconnect(client_id) -> bool
```

---

## 🔐 Security Implementation

### Login Flow
```
User enters credentials
    ↓
Hash password using bcrypt
    ↓
Compare with stored hash
    ↓
If match → Generate JWT token
    ↓
Token expires in 30 days
    ↓
Token required for all API calls
```

### Device Verification
```
When sending alert:
├─ Verify sender is admin ✅
├─ Verify all targets on same WiFi ✅
├─ (superseded) targets need NOT be owned by the sender — guest devices
│  have no owner; see docs/ARCHITECTURE.md
└─ Then send alert
```

### WiFi Validation
```
Device sends heartbeat with:
├─ device_id
├─ battery_level
├─ current_wifi_mac ✅

Server validates:
├─ WiFi MAC matches registered WiFi
└─ If mismatch → Device status = UNKNOWN
```

---

## 📲 Push Notification Flow

### Android (Firebase Cloud Messaging)
```
1. Device registers → Gets Firebase token
2. Store token in DB
3. Alert triggered → Send via Firebase Admin SDK
4. Firebase → Device receives notification
5. Device shows notification + beeps
```

### iOS (Apple Push Notification service)
```
1. App requests notification permission
2. Device registers → Gets APNs token
3. Store token in DB
4. Alert triggered → Send via APNs
5. APNs → Device receives notification
6. Device shows notification + beeps
```

---

## 🚀 Phase 1 Implementation Steps

### Week 1-2: Backend Setup
- [ ] Flask/FastAPI project structure
- [ ] PostgreSQL database setup
- [ ] Users table + auth service
- [ ] JWT token generation
- [ ] Login/register endpoints

### Week 2-3: Device Management
- [ ] Devices table
- [ ] Device registration endpoint
- [ ] Heartbeat mechanism
- [ ] Device status tracking
- [ ] WebSocket setup for real-time updates

### Week 3-4: Alert System
- [ ] Alert logic implementation
- [ ] WiFi validation
- [ ] Firebase Admin SDK integration
- [ ] APNs integration
- [ ] Alert logging

### Week 4-5: React Native App
- [ ] Project setup (iOS, Android, Windows, macOS)
- [ ] Auth screens (login/register)
- [ ] Dashboard screen
- [ ] Real-time status updates
- [ ] Push notification setup

### Week 5-6: Frontend Features
- [ ] Send alert functionality
- [ ] Settings screen
- [ ] Device management
- [ ] Battery display
- [ ] Offline handling

### Week 6-8: Testing & Polish
- [ ] End-to-end testing
- [ ] Push notification testing (Android + iOS)
- [ ] Cross-platform testing
- [ ] Error handling
- [ ] UI/UX polish

---

## 🔧 Tech Stack Details

### Backend: Python
```
Framework: Flask or FastAPI
├─ FastAPI recommended (async, built-in WebSocket)
├─ Uvicorn (ASGI server)
├─ Pydantic (data validation)
├─ SQLAlchemy (ORM)
├─ PyJWT (JWT tokens)
├─ bcrypt (password hashing)
├─ firebase-admin (Firebase SDK)
├─ aioredis (WebSocket pub/sub - optional)
└─ python-dotenv (environment variables)
```

### Frontend: React Native
```
Language: TypeScript (recommended)
├─ React Native
├─ React Navigation (routing)
├─ axios/fetch (HTTP requests)
├─ @react-native-async-storage (local storage for token)
├─ react-native-push-notification (local notifications)
├─ firebase-messaging (Firebase Cloud Messaging - Android)
├─ @react-native-camera-roll (if needed later)
├─ Tailwind CSS or styled-components
└─ Expo (optional - for development speed)
```

### Database: PostgreSQL
```
Version: 12+
├─ UUID extension
├─ JSON support
├─ Connection pooling (PgBouncer)
└─ Automated backups
```

### Infrastructure
```
Hosting: devinderpansar.com (existing)
├─ Web server: Nginx (reverse proxy)
├─ ASGI server: Uvicorn
├─ Database: PostgreSQL
├─ Certificates: SSL/TLS
└─ Monitoring: Basic logging
```

### External Services
```
Firebase:
├─ Firebase Console project
├─ Firebase Admin SDK credentials (JSON key)
└─ Cloud Messaging enabled

Apple:
├─ Apple Developer account
├─ APNs certificate (.p8 or .p12)
└─ Provisioning profiles
```

---

## 📊 Data Flow Examples

### Example 1: Login
```
iPhone app:
├─ User enters: email + password
├─ POST /auth/login
└─ Returns: token + user_id

Server:
├─ Validate credentials
├─ Hash password check
├─ Generate JWT token
└─ Return token

iPhone app:
└─ Store token in local storage
```

### Example 2: Device Registration
```
Samsung S24:
├─ App opens → Detects on Home-WiFi
├─ Gets Firebase push token
├─ POST /devices/register
│  ├─ device_name: "Samsung S24"
│  ├─ device_type: "android"
│  ├─ push_token: "firebase_token_xyz..."
│  └─ wifi_mac: "00:1A:2B:3C:4D:5E"
└─ Returns: device_id

Server:
├─ Verify token (which user?)
├─ Create device record
├─ Store push token
└─ Set status: ONLINE
```

### Example 3: Send Alert
```
iPhone 17 Pro (you):
├─ See device list
├─ Click "Send Alert" on Samsung S24
├─ POST /alerts/send
│  ├─ device_ids: ["s24_device_id"]
│  └─ Headers: Authorization token
└─ App shows: "Alert sent ✅"

Server:
├─ Verify you are admin
├─ Check: S24 on your WiFi? YES ✅
├─ Get S24 push token
├─ Send via Firebase
├─ Log alert
└─ Return: success

Samsung S24:
├─ Firebase delivers notification
├─ App receives
├─ Device beeps + vibrates 📢
└─ You hear it and find it! 🎉
```

---

## 🐛 Error Handling

### Common Errors
```
401 Unauthorized
├─ Missing token
├─ Invalid token
└─ Token expired → Redirect to login

400 Bad Request
├─ Invalid device_id
├─ Missing required fields
└─ Invalid WiFi MAC

403 Forbidden
├─ User not admin
├─ Device belongs to different user
└─ Device not on same WiFi

404 Not Found
├─ Device doesn't exist
├─ WiFi not found
└─ User not found

500 Server Error
├─ Database error
├─ Firebase error
└─ APNs error
```

---

## 📈 Future Enhancements (Phase 2+)

```
✅ Smart device naming (LLM suggests names)
✅ Device grouping (send alert to specific groups)
✅ Multi-admin support (family members as admins)
✅ Multiple WiFi networks (if you move)
✅ Alert history + statistics
✅ Android native app (if not using Expo)
✅ iOS native app (if not using Expo)
✅ Persistent connections (keep devices connected even offline)
✅ Custom alert sounds
✅ Device location (if GPS available)
```

---

## ✅ Pre-Launch Checklist

```
Backend:
- [ ] All endpoints tested with Postman
- [ ] Error handling complete
- [ ] Database backups working
- [ ] Firebase credentials configured
- [ ] APNs certificate installed
- [ ] Environment variables set
- [ ] Rate limiting enabled
- [ ] Logging enabled

Frontend:
- [ ] All screens functional
- [ ] Push notifications working (Android + iOS)
- [ ] Token refresh working
- [ ] Offline handling working
- [ ] Cross-platform tested

Deployment:
- [ ] SSL certificate renewed
- [ ] Database migrated
- [ ] Server tested
- [ ] Monitoring alerts set
- [ ] Documentation written
```

---

## 📝 Notes

- Keep Phase 1 focused: auth + device discovery + alerts
- Test push notifications early (they're critical)
- Use Postman for API testing before frontend
- Start with iOS testing first (easier APNs setup)
- Create script to auto-generate database schema
- Document all API changes in version control

