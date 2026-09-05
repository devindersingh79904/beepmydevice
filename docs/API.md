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

Validation failures return **422** with one entry per bad field, so a client can
highlight all of them in one pass. `VAL_003` and `VAL_004` are per-field codes:
a generic `VAL_002` is only used for fields with no code of their own.

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

### PUT /auth/change-password

```json
{ "current_password": "…", "new_password": "at-least-8-chars" }
```

Requires the current password as well as the new one: without it a stolen but
still-valid token would be enough to lock the real owner out.

Errors: `AUTH_001` current password wrong · `VAL_004` new password too weak.

### POST /auth/forgot-password

```json
{ "email": "user@example.com" }
```

Always returns `200` with the same message, registered or not — otherwise this
becomes the account enumerator `/auth/login` deliberately is not. The token is
single-use, expires in an hour, and is stored only as a SHA-256 hash. With no
SMTP configured the link is logged instead of emailed.

### POST /auth/reset-password

```json
{ "token": "…", "new_password": "at-least-8-chars" }
```

Errors: `AUTH_003` token unknown, already used, or expired.

### GET /auth/preferences · PUT /auth/preferences

```json
{
  "notifications_enabled": true,
  "sound_enabled": true,
  "vibration_enabled": false,
  "alert_on_silent": false
}
```

On `PUT` every field is optional; only what is sent is written, so a client can
push the one toggle the user flipped without clobbering a change made on
another device.

`notifications_enabled` is enforced server-side: an alert is not pushed to a
device whose owner has switched it off. Guest devices have no owner and so are
unaffected by anyone's preferences.

`alert_on_silent` decides whether an alert stays audible on a phone whose
ringer is silenced. It is read at push time to choose an Android notification
channel (`ANDROID_CHANNEL_ALERT` vs `ANDROID_CHANNEL_ALERT_SILENT_OVERRIDE`)
and, on iOS, whether to send a critical alert. The choice has to be made here
because the receiving app is usually not running when the alert lands — the
system draws the notification, and only the channel says how loud. A channel's
audio behaviour is frozen when Android creates it, which is why this is two
channels rather than one with a flag, and why their ids are versioned.

`sound_enabled` and `vibration_enabled` reach only the foreground path, where
the app rings for itself. They cannot mute a notification channel: past the
first install that is the user's decision to make in Android's own settings.

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
could ever administer. A guest naming an unclaimed MAC gets **404** with
`DEVICE_001`.

Registering again with a push token already on this network **updates that
device** rather than adding a second row — a reinstall must not leave the admin
looking at the same phone twice. Ownership has to match, so a re-registration
never converts an owned device into a guest or the reverse.

Errors: `VAL_002` malformed `wifi_mac` · `DEVICE_003` unsupported
`device_type` · `AUTH_003` a token was supplied but is invalid (an expired
session must not silently downgrade a device into a guest).

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

### POST /devices/scan

```json
{
  "wifi_mac": "00:1A:2B:3C:4D:5E",
  "devices": [
    { "ip_address": "192.168.1.30", "device_name": "Living Room TV",
      "device_type": "tv", "discovered_via": "MDNS" },
    { "ip_address": "192.168.1.44", "device_name": null,
      "device_type": null, "discovered_via": "SWEEP" }
  ]
}
```

Records what a client saw on its WiFi network. **The scan runs on the phone,
not on the server.** This API is a cloud relay: an ARP or subnet scan executed
here enumerates the hosting provider's network -- other tenants' machines --
and never sees the caller's home at all. A client that is actually on the
network is the only thing that can do the looking, so this endpoint is the only
way these rows ever appear.

Every field is a claim by that client and is stored for display only. A
discovered device has no push token and can never be alerted. The one thing
verified is `wifi_mac`: it must name a network the caller already administers.
A scan never *creates* a network -- if it could, naming a MAC would be enough
to claim the router it belongs to.

`discovered_via` is `MDNS` or `SWEEP`, and the two are not equally trustworthy:
an mDNS name is what the device says it is called, while a sweep result means
only that something answered at that address. A sweep therefore sends
`device_name: null` rather than inventing one.

At most 512 observations per submission. Rows are keyed by
`(wifi_id, ip_address)`, not by MAC: a MAC is not obtainable -- Android has
blocked `/proc/net/arp` since API 29 and neither mDNS nor an HTTP probe reveals
one -- so keying on it would collapse a whole network into a single row.

Errors: `DEVICE_005` the caller does not administer this network (403) ·
`VAL_002` a malformed address or an oversized list (422).

### GET /devices/discovered

Returns the observations for the caller's current network, most recently seen
first. Empty for a network nobody has scanned, which is not an error.

Observations older than 24 hours are dropped when the next scan arrives:
something unplugged last week never appears in a scan again and would otherwise
sit in the dashboard forever.

### DELETE /devices/discovered/{discovered_id}

Drops one observation. It reappears if a later scan sees the device again --
this is a record of what is on the network, not a list the admin curates.

Errors: `DEVICE_005` unknown id, or one on a network the caller does not
administer (403). Both report the same code deliberately: telling them apart
would let a caller probe which ids exist on networks they cannot see.

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
network, the sender is that network's admin, and no target has left that
network. Any failure aborts the whole request; there is no partial delivery.

Note that targets need not be *owned* by the sender: guest devices belong to no
account at all, and alerting them is the point of guest access. Shared network
membership is the boundary, not ownership. Ownership is still required of the
**sender**, which is what makes guest sending impossible rather than merely
hidden — a guest holds only a device token and cannot authenticate here.

Errors: `ALERT_001` targets on different networks (400) · `ALERT_002` no
targets available (400) · `ALERT_003` permission denied (403) · `ALERT_004`
push delivery failed (per device, inside a 200) · `ALERT_005` a guest attempted
to send (403).

`ALERT_005` is what a guest gets for presenting its `device_token` here. That is
a valid credential which simply may not do this, so it is reported as its own
code rather than as `AUTH_003` — an `AUTH_*` code tells the client to clear the
session and show the login screen, which is the wrong response to "you are a
guest".

Naming an `UNKNOWN` device explicitly is `ALERT_002` and sends nothing at all.
An empty `device_ids` instead targets every device still attached to the
network, since the caller named nobody in particular.

`OFFLINE` is **not** a bar to being alerted. It means only that the device has
not heartbeated recently, which every phone stops doing within ninety seconds
of being put down, while FCM and APNs deliver to a phone that is asleep or
locked. `UNKNOWN` is the bar, and it is a different claim: the device answered
from a *different* WiFi MAC, so the proximity guarantee no longer covers it.

### GET /alerts/logs

Query: `page`, `limit`. Returns the caller's alert history, newest first.

### GET /alerts/logs/device/{device_id}

Query: `page`, `limit`. Returns the alerts that targeted one device, newest
first. Scoped by network administration rather than ownership, so an admin can
read a guest device's history — a guest has no owner.

Errors: `DEVICE_001` not found · `AUTH_004` device on another network.

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
| `DEVICE_005` | Not this network's admin | Banner |
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
