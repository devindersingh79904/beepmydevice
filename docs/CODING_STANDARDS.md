# Coding Standards - WiFi Alert System

## 1. Code Quality (Senior Developer Level)

### SOLID Principles
```
S - Single Responsibility
  ✅ Each class/function does ONE thing
  ❌ AuthService doesn't handle notifications
  
O - Open/Closed
  ✅ Open for extension, closed for modification
  
L - Liskov Substitution
  ✅ Derived classes don't break base behavior
  
I - Interface Segregation
  ✅ Small, focused interfaces
  
D - Dependency Injection
  ✅ Pass dependencies, don't create them
```

### Other Principles
```
DRY - Don't Repeat Yourself
  ✅ Extract common code to utilities
  
KISS - Keep It Simple, Stupid
  ✅ Simple code > clever code
  ✅ Easy to read > hard to maintain
  
YAGNI - You Aren't Gonna Need It
  ✅ Don't code features you don't need yet
```

### Code Style
```
✅ Clear variable names (not a, b, c)
✅ Functions < 20 lines
✅ Classes < 200 lines
✅ Comments only for WHY, not WHAT
✅ Type hints everywhere (Python)
✅ Error handling at boundaries
✅ No magic numbers (use constants)
```

---

## 2. Response Format (Industry Standard)

### Success Response (List with Pagination)
```json
{
  "success": true,
  "status_code": 200,
  "data": {
    "content": [
      { "device_id": "123", "name": "iPhone" },
      { "device_id": "456", "name": "Samsung" }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 5,
      "total_count": 100,
      "page_size": 20,
      "has_next": true,
      "has_prev": false
    }
  },
  "correlation_id": "req-12345-xyz789",
  "timestamp": "2024-08-30T14:30:45.123Z",
  "message": "Devices retrieved successfully"
}
```

### Success Response (Single Item)
```json
{
  "success": true,
  "status_code": 200,
  "data": {
    "content": { "device_id": "abc123", "device_name": "iPhone 17" }
  },
  "correlation_id": "req-12345-xyz789",
  "timestamp": "2024-08-30T14:30:45.123Z",
  "message": "Device retrieved successfully"
}
```

### Validation Error Response (Multiple)
```json
{
  "success": false,
  "status_code": 400,
  "data": null,
  "errors": [
    { "field": "email", "message": "Invalid format", "code": "VAL_003" },
    { "field": "password", "message": "Too short", "code": "VAL_004" }
  ],
  "correlation_id": "req-12345-xyz789",
  "timestamp": "2024-08-30T14:30:45.123Z"
}
```

### Other Error Response
```json
{
  "success": false,
  "status_code": 401,
  "data": null,
  "errors": [
    { "code": "AUTH_002", "message": "Token expired" }
  ],
  "correlation_id": "req-12345-xyz789",
  "timestamp": "2024-08-30T14:30:45.123Z"
}
```

### Error Codes
```
Authentication:
├─ AUTH_001: Invalid credentials
├─ AUTH_002: Token expired
├─ AUTH_003: Token invalid
└─ AUTH_004: Unauthorized access

Device:
├─ DEVICE_001: Device not found
├─ DEVICE_002: Device offline
├─ DEVICE_003: Invalid device type
└─ DEVICE_004: Device already registered

Alert:
├─ ALERT_001: Different WiFi networks
├─ ALERT_002: No target devices
├─ ALERT_003: Permission denied
└─ ALERT_004: Push notification failed

Validation:
├─ VAL_001: Missing required field
├─ VAL_002: Invalid field format
├─ VAL_003: Invalid email format
└─ VAL_004: Password too weak
```

---

## 3. Logging Standards

### Log Levels
```
DEBUG - Development info
  ├─ Variable values
  ├─ Function entry/exit
  └─ Detailed flow

INFO - Important events
  ├─ User login success
  ├─ Device registered
  ├─ Alert sent
  └─ Major operations

WARNING - Unexpected but handled
  ├─ Device offline
  ├─ Push notification retry
  └─ Deprecated API usage

ERROR - Something failed
  ├─ Database error
  ├─ Push notification failed
  ├─ Authentication failed
  └─ Always include exception

CRITICAL - System breaking
  ├─ Database connection lost
  ├─ Server out of memory
  └─ Security breach attempt
```

### Log Format
```
[TIMESTAMP] [LOG_LEVEL] [CORRELATION_ID] [SERVICE] [MESSAGE]

Example:
2024-08-30T14:30:45.123Z INFO req-12345-xyz789 auth_service User logged in: user_id=abc123
2024-08-30T14:30:46.456Z DEBUG req-12345-xyz789 device_service Processing heartbeat from device_id=xyz789
2024-08-30T14:30:47.789Z ERROR req-12345-xyz789 alert_service Failed to send push notification: error=APNs_timeout
```

### What to Log
```
✅ All API requests (method, path, user_id)
✅ All API responses (status_code, correlation_id)
✅ Database queries (for debugging, not production)
✅ All errors (exception + context)
✅ Business events (login, alert sent, device registered)
✅ Performance (slow operations > 1 second)
❌ Passwords, tokens, sensitive data
❌ Too verbose debug logs in production
```



---

## 4. Correlation ID Flow

### Frontend Standards
- Generate correlation_id once per user session (UUID)
- Include correlation_id in X-Correlation-ID header on every API call
- Store correlation_id for debugging purposes
- Log it in console for tracing

### Backend Standards
- Every endpoint must extract correlation_id from request header
- If not present, generate new UUID
- Include correlation_id in all responses
- Pass correlation_id to all service layers for logging

---

## 5. Pagination (Industry Standard)

### Request
```
GET /api/devices/list?page=1&limit=20&sort=-created_at

Query Params:
├─ page: Page number (default: 1)
├─ limit: Results per page (default: 20, max: 100)
└─ sort: Field name (prefix with - for desc)
```

### Response
```json
{
  "success": true,
  "status_code": 200,
  "data": [
    { "device_id": "123", "device_name": "iPhone" },
    { "device_id": "456", "device_name": "Samsung" }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 5,
    "total_count": 100,
    "page_size": 20,
    "has_next": true,
    "has_prev": false
  },
  "correlation_id": "req-12345-xyz789",
  "timestamp": "2024-08-30T14:30:45.123Z"
}
```

### Pagination Implementation Standards
- Default page size: 20
- Maximum page size: 100
- Calculate offset: (page - 1) * limit
- Return total_count, total_pages, has_next, has_prev
- Support sort parameter (field name with optional - prefix for desc)

---

## 6. API Request/Response Logging

### Log Every Request
```
[2024-08-30T14:30:45.123Z] [INFO] [req-12345-xyz789] [api] 
  REQUEST: POST /api/alerts/send
  User: user_id=abc123
  Headers: Authorization: Bearer token_xyz...
```

### Log Every Response
```
[2024-08-30T14:30:45.456Z] [INFO] [req-12345-xyz789] [api]
  RESPONSE: 200 OK
  Duration: 331ms
  Data: {"success": true, "alert_id": "alert_789"}
```

### Logging Middleware Standards
- Log every request: method, path, user_id, correlation_id
- Log every response: status_code, duration (in ms), correlation_id
- Measure request duration automatically
- Pass correlation_id through entire request lifecycle

---

## 7. Error Handling Best Practices

### Error Handling Standards
- Catch specific exceptions first, then generic Exception
- Always log exceptions with exc_info=True (full stack trace)
- Return structured error response with error code and correlation_id
- Never expose internal system details to frontend
- Log the correlation_id with every error for traceability

---

## 8. Type Hints (Python)

### Type Hints Standards
- Use type hints on all function parameters
- Use type hints on all function return types
- Use typing module for complex types (List, Dict, Optional, etc)
- IDE will catch type mismatches during development

---

## 9. Constants & Configuration

### Constants Standards
- Define all magic numbers as named constants
- Use UPPERCASE_WITH_UNDERSCORES for constant names
- Centralize all constants in config.py or constants.py
- Examples: MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE, JWT_EXPIRATION_DAYS

---

## 10. Error Array Format

### Multiple Errors in Array
All errors returned as **errors: []** array (not single error object)

### Validation Errors (Multiple Fields)
```
errors: [
  { field: "email", message: "Invalid format", code: "VAL_003" },
  { field: "password", message: "Too short", code: "VAL_004" },
  { field: "device_name", message: "Required", code: "VAL_001" }
]
```

### Other Errors (Multiple Reasons)
```
errors: [
  { code: "DB_001", message: "Database connection failed" },
  { code: "PUSH_001", message: "Push service unavailable" }
]
```

---

## 11. Frontend Error Handling

### Error Display Standards
- Show all errors from errors[] array
- Display in alert/banner (red background)
- Auto-close after 5 seconds
- User can manually close before 5 seconds
- Clear error state when user navigates away

### Specific Error Codes
- Keep track of error codes for different handling
- VAL_* codes = validation errors (form highlight)
- AUTH_* codes = authentication (redirect to login)
- DEVICE_* codes = device errors (user-friendly message)
- Other codes = generic errors (show message)

---

## 12. Testing Checklist

Before committing code:
```
✅ Unit tests written
✅ Error cases tested
✅ All logs verified
✅ Correlation ID flows correctly
✅ Pagination works
✅ No hardcoded values
✅ Type hints complete
✅ Response format consistent
```

---

## Summary

```
Senior developer code = 
  ✅ Clean architecture (SOLID principles)
  ✅ Proper logging (all requests/responses)
  ✅ Structured responses (data + pagination inside)
  ✅ Correlation IDs (end-to-end traceability)
  ✅ Error handling (array format, auto-close 5s)
  ✅ Type hints (Python)
  ✅ Industry standards (pagination, error codes)
  ✅ Constants (no magic numbers)
  ✅ Validation errors (multiple in array)
  ✅ No technical debt
```

