# API Reference

Base URL: `http://localhost:8000` (dev) · `https://beepmydevice.com` (prod)
Interactive docs: `/docs` (disabled in production)

---

## Request headers

| Header | Required | Notes |
|---|---|---|
| `Authorization` | All except register/login and guest device registration | `Bearer {token}` |
| `X-Correlation-ID` | Recommended | One UUID per client session; generated server-side if absent |
| `Content-Type` | On POST/PUT | `application/json` |

---

## The response envelope

Every endpoint returns the same shape. There are no bare payloads and no bare
lists.

**Success**

```json
{
  "success": true,
  "status_code": 200,
  "data": {
    "content": [{ "device_id": "…", "device_name": "iPhone 17" }],
    "pagination": {
      "current_page": 1,
      "total_pages": 5,
      "total_count": 100,
      "page_size": 20,
      "has_next": true,
      "has_prev": false
    }
  },
  "errors": [],
  "correlation_id": "req-uuid",
  "timestamp": "2026-08-30T14:30:45.123Z",
  "message": "Devices retrieved successfully"
}
```

`data.content` holds the payload for single items and collections alike.
`data.pagination` is present only on list endpoints.

**Error**

```json
{
  "success": false,
  "status_code": 400,
  "data": null,
  "errors": [
    { "field": "email", "message": "Please enter a valid email address", "code": "VAL_003" },
    { "field": "password", "message": "Password must be at least 8 characters", "code": "VAL_004" }
  ],
  "correlation_id": "req-uuid",
  "timestamp": "2026-08-30T14:30:45.123Z"
}
```

`errors` is **always an array**, even for a single failure. Validation returns
one entry per invalid field so the client can highlight all of them at once
rather than surfacing them one submission at a time.

---

## Pagination

```
GET /devices/list?page=1&limit=20&sort=-created_at
```

| Param | Default | Max | Notes |
|---|---|---|---|
| `page` | 1 | — | 1-indexed |
| `limit` | 20 | 100 | Values above the max are rejected |
| `sort` | — | — | Field name; prefix `-` for descending |

---

## Authentication

### POST /auth/register

```json
{ "email": "user@example.com", "password": "at-least-8-chars" }
```

Returns `201` with `user_id`, `token`, `token_type` and `expires_at`. A token is
issued immediately so the client can register its device without a second round
trip.

Errors: `VAL_003` invalid email · `VAL_004` weak password · `409` email taken.

### POST /auth/login

```json
{ "email": "user@example.com", "password": "…" }
```

Returns `200` with the same token payload.

Errors: `AUTH_001` invalid credentials. An unknown email and a wrong password
return the identical error — the endpoint does not reveal whether an address is
registered.

### POST /auth/logout

Invalidates the caller's token. Returns `200`.

---

## Devices

### POST /devices/register

The only endpoint that accepts an unauthenticated request. What gets created
depends on whether an `Authorization` header is present — **not** on anything
in the body, so a client cannot ask to be an owner.

```json
{
  "device_name": "Devinder's iPhone",
  "device_type": "ios",
  "device_os_version": "17.2",
  "push_token": "…",
  "wifi_mac": "00:1A:2B:3C:4D:5E",
  "network_name": "Home-WiFi"
}
```

**With a user token — owned device**

```json
{ "device_id": "uuid", "is_guest": false, "device_token": null }
```

**Without a token — guest device**

```json
{ "device_id": "uuid", "is_guest": true, "device_token": "…" }
```

A guest belongs to the WiFi network but to no account. It appears in the
admin's device list immediately, with no approval step, and can be alerted
straight away. `device_token` authorises only that device's own heartbeat —
never listing, never alerting — so a guest can stay visible without holding an
account or gaining any ability to act on the network.

An owned registration finds or creates the `wifi_networks` row for the MAC. A
**guest registration requires the network to already exist**: otherwise the
first device on an unknown MAC would create an ownerless network that nobody
could ever administer.

Errors: `DEVICE_003` unsupported type · `DEVICE_004` already registered ·
`VAL_002` malformed MAC · `DEVICE_001` guest registering against an unclaimed
network.

### GET /devices/list

Query: `page`, `limit`, `sort`. Returns **every device on the caller's
network**, guests included, each flagged with `is_guest`. Scoped by network
rather than by owner — guest devices are precisely the ones an admin may need
to find. Push tokens are never included.

Requires a user token. A guest holds only a device token and can never
enumerate the network it joined.

### GET /devices/{device_id}

Returns one device. Errors: `DEVICE_001` not found · `AUTH_004` not the owner.

### PUT /devices/{device_id}/heartbeat

```json
{ "battery_level": 85, "wifi_mac": "00:1A:2B:3C:4D:5E" }
```

Called every 30 seconds. `battery_level` may be `null` on platforms without a
battery. The `wifi_mac` is re-sent each time so the server can detect a device
that has moved off its registered network — which sets status to `UNKNOWN`, not
`ONLINE`.

Accepts **either** the owner's user token or the `device_token` issued at guest
registration, since guests must keep reporting status without an account.
Either credential must resolve to *this* device: one device may never heartbeat
on behalf of another.

Errors: `DEVICE_001` not found · `VAL_002` battery outside 0–100 · `AUTH_004`
credential belongs to a different device.

### DELETE /devices/{device_id}

Unregisters a device and clears its push token. The network admin may remove
any device on their network, guests included — that control is what makes open
guest registration acceptable.

---

## Alerts

### POST /alerts/send

```json
{ "device_ids": ["uuid-1", "uuid-2"] }
```

An empty `device_ids` targets every device on the sender's network.

Returns `200`:

```json
{
  "alert_id": "uuid",
  "delivery_status": [
    { "device_id": "uuid-1", "device_name": "Samsung S24", "status": "SENT", "error_code": null },
    { "device_id": "uuid-2", "device_name": "iPad", "status": "FAILED", "error_code": "ALERT_004" }
  ]
}
```

Status is reported per device, so one failed push does not fail the others.

An empty `device_ids` targets every device on the network, **guests included**.

Authorization runs three checks before anything is sent — all targets share one
network, the sender is that network's admin, and the targets are reachable. Any
failure aborts the whole request; there is no partial delivery.

Note that targets need not be *owned* by the sender: guest devices belong to no
account at all, and alerting them is the point of guest access. Shared network
membership is the boundary, not ownership. Ownership is still required of the
**sender**, which is what makes guest sending impossible rather than merely
hidden — a guest holds only a device token and cannot authenticate here.

Errors: `ALERT_001` targets on different networks · `ALERT_002` no targets
available · `ALERT_003` permission denied · `ALERT_004` push delivery failed ·
`ALERT_005` a guest attempted to send.

### GET /alerts/logs

Query: `page`, `limit`. Returns the caller's alert history, newest first.

---

## WebSocket

```
ws://localhost:8000/ws/status        (wss:// in production)
```

Send the JWT as the first frame after connecting — the handshake cannot carry an
`Authorization` header. An unauthenticated socket is closed immediately.

Frames pushed to the client:

```json
{ "device_id": "uuid", "status": "ONLINE", "battery": 85, "timestamp": "2026-08-30T14:30:45.123Z" }
```

The socket drops routinely when a phone sleeps or changes network. Reconnect
with exponential backoff; this is normal operation, not an error to show the
user.

---

## Error codes

| Code | Meaning | Client action |
|---|---|---|
| `AUTH_001` | Invalid credentials | Show message |
| `AUTH_002` | Token expired | Clear session, go to login |
| `AUTH_003` | Token invalid | Clear session, go to login |
| `AUTH_004` | Unauthorized | Clear session, go to login |
| `DEVICE_001` | Device not found | Banner |
| `DEVICE_002` | Device offline | Banner |
| `DEVICE_003` | Invalid device type | Banner |
| `DEVICE_004` | Device already registered | Banner |
| `ALERT_001` | Different WiFi networks | Banner |
| `ALERT_002` | No target devices | Banner |
| `ALERT_003` | Permission denied | Banner |
| `ALERT_004` | Push notification failed | Banner |
| `ALERT_005` | Guest cannot send alerts | Banner |
| `VAL_001` | Missing required field | Highlight field |
| `VAL_002` | Invalid field format | Highlight field |
| `VAL_003` | Invalid email format | Highlight field |
| `VAL_004` | Password too weak | Highlight field |
| `DB_001` | Database error | Banner |
| `PUSH_001` | Push service unavailable | Banner |
| `SYS_001` | Internal error | Banner |

Codes are part of the public contract. They are never renumbered; new codes are
appended.

---

## Health

`GET /health` returns `{"status": "ok", "environment": "…"}`. No auth required.
Used by the load balancer and the Docker healthcheck.
