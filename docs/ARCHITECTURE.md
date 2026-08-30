# Architecture

High- and low-level design for BeepMyDevice.

---

## The central idea

Every device finder on the market groups devices by **account**. BeepMyDevice
groups them by **network**.

That one substitution is what makes cross-account alerting possible, and it is
also the security model: a device may be alerted only by someone on the same
WiFi network. The network is the proximity proof -- you can only ring what is
already within earshot.

Everything below follows from that decision.

---

## System overview

```
+-----------------------------------------------------------+
|                  Client apps (React Native)               |
|      iOS   .   Android   .   macOS   .   Windows          |
+-----------+---------------------------------+-------------+
            | HTTPS + WSS                     | push receipt
            v                                 ^
+-----------------------------------------+---+-------------+
|              FastAPI backend            |                 |
|  +-----------------------------------+  |                 |
|  | routes/     thin HTTP + WS layer  |  |                 |
|  +-----------------------------------+  |                 |
|  | services/   auth . device . alert |  |                 |
|  |             notification . ws     |--+                 |
|  +-----------------------------------+                    |
|  | models/     SQLAlchemy ORM        |                    |
|  +-----------------------------------+                    |
+-----------+---------------------+-------------------------+
            v                     v
   +----------------+    +------------------+
   |  PostgreSQL    |    |  FCM  .  APNs    |
   +----------------+    +------------------+
```

Alerts travel **out through the push providers**, not over the local network.
The server is a cloud relay: there is no hub, bridge or daemon in the home. The
WiFi network is used purely as an identity check, never as a transport.

---

## Layering

```
routes/      HTTP shape only. Parse, delegate, format.
  |
services/    All domain rules. No FastAPI imports.
  |
models/      Persistence only.
```

Nothing calls upward. Services raise domain exceptions (LookupError,
PermissionError, ValueError) and routes translate them into error codes, so the
domain logic has no idea HTTP exists and could be reused by a worker or CLI
unchanged.

### The five services

| Service | Owns |
|---|---|
| `AuthService` | Accounts, bcrypt hashing, JWT issue and verification |
| `DeviceService` | The registry, heartbeats, derived status |
| `AlertService` | Authorization, routing, audit logging |
| `NotificationService` | Provider adapter -- FCM for Android, APNs for iOS |
| `WebSocketManager` | Live connections, status broadcasting |

`AlertService` is the security-critical one. `NotificationService` exists so
that alert logic never branches on platform: it hands over a device and a
message, and provider choice is made in one place.

---

## Data model

```
users --+--< wifi_networks --< devices
        +--< devices
        +--< alert_logs
```

Four tables, UUID primary keys throughout, all timestamps UTC.

`wifi_networks.mac_address` is unique, so one physical router maps to exactly
one row and every device reporting that MAC lands in the same alert group.
Devices carry a foreign key to both the user and the network -- the user for
ownership, the network for the alert-group check. `alert_logs.target_devices` is
a text array rather than a join table: rows are written once and never queried
by individual target.

Foreign keys cascade, so deleting a user removes their networks and devices in
one statement.

Full DDL: [BeepMyDevice_Repository_Setup.md](BeepMyDevice_Repository_Setup.md).

---

## Key flows

### Device registration

```
App opens
  -> request notification permission -> push token
  -> request location permission -> read WiFi BSSID
  -> POST /devices/register
  -> server finds or creates the wifi_networks row for that MAC
  -> device stored with status ONLINE
```

Location permission is required because both platforms classify the BSSID as
location data. Without it the app cannot identify the network, and therefore
cannot work at all.

### Heartbeat

Every 30 seconds a device sends its battery level and its *current* WiFi MAC.
The server compares that MAC against the one the device registered with:

| Condition | Resulting status |
|---|---|
| MAC matches | `ONLINE` |
| MAC differs | `UNKNOWN` |
| No heartbeat for 90s (3 x interval) | `OFFLINE` |

`UNKNOWN` is a distinct state on purpose. The device is reachable, but it has
left the network, so it is outside the alert group and must not be alertable.

### Sending an alert

```
POST /alerts/send
  -> 1. sender owns every target?      no -> ALERT_003
  -> 2. all targets share one wifi_id? no -> ALERT_001
  -> 3. sender is the network admin?   no -> ALERT_003
  -> resolve push tokens
  -> fan out via FCM / APNs, bounded concurrency
  -> write alert_logs row
  -> return per-device delivery status
```

The three checks run in that order and any failure aborts the entire request.
There is no partial delivery -- a request that would ring three of four devices
rings none, so the sender is never left believing an alert went out when it did
not.

Delivery status is reported per device, so a single failed push surfaces as
`ALERT_004` for that device without failing the others.

### Real-time status

The dashboard opens a WebSocket to `/ws/status` and sends its JWT as the first
frame -- the handshake cannot carry an `Authorization` header. Heartbeats
handled by the API are broadcast to connected dashboards, so status and battery
update without polling.

**Known limit:** `WebSocketManager` holds connections in process memory. A
multi-process deployment needs shared pub/sub (Redis) so a heartbeat handled by
one worker reaches a dashboard connected to another. Single-worker deployment is
fine for Phase 1; this is a Phase 2 item.

---

## Security

**Authentication** -- bcrypt password hashing, JWT with a 30-day expiry carried
in the `Authorization` header. Tokens never appear in URLs or logs.

**Authorization** -- ownership and network membership are re-verified on the
server for every alert. The client is never trusted to assert which network it
is on: the WiFi MAC arrives with each heartbeat and is checked against the
registration.

**Transport** -- HTTPS and WSS in production, terminated at Nginx.

**Data** -- passwords and push tokens are never logged and never returned by any
endpoint. Errors return generic messages; internal detail stays server-side.

### Threat notes

A device that reports a *spoofed* WiFi MAC could join an alert group it does not
belong to. This is bounded by the requirement that the attacker also holds valid
credentials for an account on that network, so practical exposure is low for
Phase 1. Binding a device to a network on first registration and requiring admin
approval for re-binding is the Phase 2 hardening.

---

## Cross-cutting concerns

**Correlation IDs.** The client generates one UUID per session and sends it as
`X-Correlation-ID`. The backend binds it to a `ContextVar` in middleware, so
every log line from every service carries it without being passed explicitly.
One ID traces a request across both sides of the stack.

**The response envelope.** Every endpoint returns the same shape, so the client
parses one structure. `errors` is always an array -- validation returns one
entry per bad field, and the UI renders all of them at once.

**Event loop discipline.** Handlers are `async def`, but SQLAlchemy sync
sessions, bcrypt and the push SDKs all block. Each is offloaded via
`run_blocking`; a bare call would stall every concurrent request, which matters
when every registered device heartbeats every 30 seconds.

---

## Extension points

The design leaves room for the planned phases without rework:

- **Device groups (Phase 2)** -- a `device_groups` table and a group filter in
  `AlertService.send_alert`; no change to the authorization checks.
- **Multi-admin (Phase 2)** -- an admin role on the user/network join; only
  `verify_admin` changes.
- **Multiple networks** -- already supported by the schema; a user may own many
  `wifi_networks` rows.
- **New platforms** -- add a `DeviceType` and a branch in `NotificationService`;
  nothing else is platform-aware.
