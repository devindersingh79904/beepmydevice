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

It also means an account is only needed to *send*. A device can be findable
without one, which is what guest access is: open the app on the network and you
appear in the admin's list, alertable, with no login and no approval step.

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

**`devices.user_id` is nullable**, and that is the whole guest mechanism:

| | `user_id` | Receives alerts | Sends alerts | Lists devices |
|---|---|---|---|---|
| Owned | the owner | yes | yes, if network admin | yes |
| Guest | null | yes | never | never |

Guest-ness is derived from `user_id IS NULL` rather than stored in a column of
its own, so the two can never drift apart. The API exposes it as `is_guest`.

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
       signed in?  -> owned device, belongs to that user
       not signed in? -> guest device, belongs to the network only,
                         issued a device token for its own heartbeat
  -> device stored with status ONLINE
```

Which branch runs is decided by whether the request carries a valid user token,
never by anything in the request body -- a client cannot ask to be an owner.

Location permission is required because both platforms classify the BSSID as
location data. Without it the app cannot identify the network, and therefore
cannot work at all.

A guest registration requires the network to already exist. Otherwise the first
device on an unknown MAC would create an ownerless network that nobody could
ever administer, and the alert group would have no admin to send from.

The **device token** issued to a guest authorises exactly one thing: that
device's own heartbeat. It cannot list devices, cannot send alerts, and is
scoped to a single `device_id`, so one guest cannot act on behalf of another.

### Guest access

A guest is a full participant in being *found* and a non-participant in
everything else:

- Appears in the admin's device list immediately, badged "Guest"
- Receives alerts exactly like an owned device
- Cannot send alerts -- it has no user token, so it cannot authenticate at the
  alert endpoint at all
- Cannot enumerate the network it joined
- Can be removed by the admin at any time

The disabled alert button in the UI is presentation, not the control. The
control is that sending requires a user token a guest does not have.

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
  -> 1. all targets share one wifi_id?  no -> ALERT_001
  -> 2. sender is that network's admin? no -> ALERT_003
  -> 3. any reachable targets?          no -> ALERT_002
  -> resolve push tokens
  -> fan out via FCM / APNs, bounded concurrency
  -> write alert_logs row
  -> return per-device delivery status
```

The checks run in that order and any failure aborts the entire request. There is
no partial delivery -- a request that would ring three of four devices rings
none, so the sender is never left believing an alert went out when it did not.

Note what is **not** checked: that the sender owns each target. Guest devices
have no owner, and alerting them is the point of guest access, so shared network
membership carries the entire membership boundary. Ownership is still required
of the *sender* -- check 2 -- which is what makes a guest structurally unable to
send rather than merely blocked in the interface.

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

**Authorization** -- network membership and admin rights are re-verified on the
server for every alert. The client is never trusted to assert which network it
is on: the WiFi MAC arrives with each heartbeat and is checked against the
registration.

**Guest scope** -- a guest device holds a device token, not a user token. It is
scoped to one `device_id` and authorises only that device's heartbeat. Every
capability beyond being alerted requires a user token, so guest restrictions are
structural rather than enforced by the UI.

**Transport** -- HTTPS and WSS in production, terminated at Nginx.

**Data** -- passwords and push tokens are never logged and never returned by any
endpoint. Errors return generic messages; internal detail stays server-side.

### Threat notes

**Open guest registration is a deliberate trade.** Anyone who can reach the API
and supply a valid WiFi MAC can register a guest device on that network. The
BSSID is not a secret -- it is visible to anyone in radio range -- so in practice
this means anyone near the home, or anyone who has ever been near it, can add a
device to the list.

What that gets them is bounded:

- They can **receive** alerts on their own device. A stranger's phone beeping is
  a nuisance to them, not a compromise of the household.
- They **appear in the admin's list**, which is arguably the correct outcome:
  the admin sees an unrecognised device and can remove it.
- They **cannot** enumerate devices, read any device's details, send alerts, or
  learn anything about the network beyond the MAC they already had.

The residual risk is list pollution -- a script registering many guests to make
the dashboard unusable. Rate limiting on registration (Phase 2) is the mitigation;
admin removal is the manual one available today. This was accepted because
requiring approval would defeat guest access: the guest's whole value is that a
visitor's phone becomes findable without anyone setting anything up.

**MAC spoofing.** A device reporting a MAC it cannot actually see joins an alert
group it is not physically in. For guests this is the same exposure as above.
For *owned* devices it is bounded by needing valid credentials for an account on
that network. Binding a device to a network on first registration and requiring
admin approval to re-bind is the Phase 2 hardening.

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
- **Promoting a guest** -- a guest that later signs in becomes owned by setting
  `user_id`; nothing else about the row changes, and `is_guest` follows.
- **Guest approval (Phase 2)** -- if open registration proves too permissive, a
  pending state ahead of the alert group is additive; the alert checks are
  unaffected.
- **Multiple networks** -- already supported by the schema; a user may own many
  `wifi_networks` rows.
- **New platforms** -- add a `DeviceType` and a branch in `NotificationService`;
  nothing else is platform-aware.
