# Backend Features — Implementation Order

Phase 1 sliced into units small enough to implement and verify one at a time.
Each slice names the files it touches, what "done" means, and the tests that
prove it. Work them top to bottom: each depends on the ones above.

Every slice inherits the same definition of done:

- Type hints complete; `mypy src/` clean
- `black src/` and `pylint src/` clean
- Responses built through `src/utils/responses.py`
- Blocking calls wrapped in `run_blocking`
- Business events logged at INFO, failures at ERROR with `exc_info=True`
- Tests written, including the failure paths

---

## 1. Foundations

**Files:** `config.py`, `database.py`, `utils/logger.py`, `utils/responses.py`,
`utils/constants.py`, `utils/concurrency.py`

These are already written. Read them before anything else — every later slice
builds on the envelope, the logger and `run_blocking`.

Verify: `uvicorn src.main:app --reload` starts and `/health` returns 200.

---

## 2. Logging middleware

**Files:** `middleware/logging_middleware.py`

Bind the correlation ID from `X-Correlation-ID` (generate one when absent), time
the request, log both sides, echo the ID in the response header.

Done when a request with a supplied correlation ID produces log lines carrying
that ID from every service it touches, and requests slower than
`SLOW_REQUEST_THRESHOLD_MS` are logged at WARNING.

---

## 3. Authentication

**Files:** `services/auth_service.py`, `routes/auth.py`,
`middleware/auth_middleware.py`, `models/user.py`

Register, login, JWT issue and verification, and the `get_current_user_id`
dependency.

Watch for: bcrypt is CPU-blocking — hash and verify through `run_blocking`. An
unknown email and a wrong password must return the identical `AUTH_001`, or the
endpoint becomes an account-enumeration oracle.

**Tests:** `tests/test_auth.py` — every class.

---

## 4. Device registration, owned and guest

**Files:** `services/device_service.py`, `routes/devices.py`,
`models/device.py`, `models/wifi_network.py`, `middleware/auth_middleware.py`

Register a device; find or create the `wifi_networks` row for its MAC. This is
the only endpoint that accepts an unauthenticated request: no token means a
guest, which gets a device-scoped token authorising just its own heartbeat.

Watch for:

- Two devices reporting the same MAC must share one `wifi_id` — that is the
  whole alert-grouping mechanism. Normalise the MAC before comparing
  (`normalize_mac_address`), or `00:1a:2b…` and `00-1A-2B…` become two networks.
- A *missing* token creates a guest; a token that is **present but invalid**
  must still be rejected. Otherwise an expired session silently downgrades a
  user's own device into a guest and they lose send access with no explanation.
- A guest may only join a network that already exists. Letting a guest create
  one produces an ownerless network with no admin, which nothing can ever
  administer or send from.
- Scope the guest's device token to one `device_id`. Scope it to the network
  instead and any guest can act for any other.

**Tests:** `TestDeviceRegistration` — the guest cases especially.

---

## 5. Heartbeat and status

**Files:** `services/device_service.py`

Record battery and current MAC; derive status.

| Condition | Status |
|---|---|
| MAC matches registration | `ONLINE` |
| MAC differs | `UNKNOWN` |
| Silent for `OFFLINE_THRESHOLD_SECONDS` | `OFFLINE` |

Watch for: `UNKNOWN` is not a variant of `ONLINE`. A device that moved networks
must drop out of the alert group.

**Tests:** `TestHeartbeat`, especially
`test_sets_status_unknown_when_wifi_mac_changed`.

---

## 6. Device listing and removal

**Files:** `services/device_service.py`, `routes/devices.py`

Paginated list scoped to the **network**, plus detail and delete.

Watch for: scope by `wifi_id`, not `user_id` -- an admin must see guest devices,
which is the whole point of the list. Serialise `is_guest` (derived from
`user_id IS NULL`) so the dashboard can badge them. A guest's device token must
not be able to call this at all. Never serialise `push_token`. Use
`selectinload` for the network relationship rather than touching it per row.

**Tests:** `TestDeviceList`, `TestDeviceRemoval`.

---

## 7. Push notifications

**Files:** `services/notification_service.py`

FCM for Android, APNs (`.p8`) for iOS, behind one `send` method so alert logic
never branches on platform.

Watch for: both SDKs block — always `run_blocking`. A token rejected as
unregistered is stale: clear it and mark the device offline rather than
retrying. `APPLE_USE_SANDBOX` must be false in production or alerts silently
never arrive.

---

## 8. Alerts — the security-critical slice

**Files:** `services/alert_service.py`, `routes/alerts.py`, `models/alert_log.py`

Three checks in order: shared `wifi_id`, admin rights, reachable targets. Then
fan out with `gather_with_limit`, write the audit row, return per-device status.

Watch for:

- Do **not** check that the sender owns each target. Guests have no owner, and
  alerting them is the point of guest access. Shared network membership carries
  the membership boundary; ownership is required only of the *sender*.
- Any check failing aborts the **entire** request — no partial delivery. A
  single failed push, by contrast, is `ALERT_004` for that device only and must
  not fail the others.
- Empty `device_ids` means the whole network, guests included.

**Tests:** all of `tests/test_alerts.py`. `TestAlertAuthorization` is the most
important set in the codebase — it is what stops one household beeping
another's devices.

---

## 9. WebSocket status

**Files:** `services/websocket_manager.py`, `routes/websocket.py`

Accept a connection, authenticate from the first frame, broadcast status and
battery changes from the heartbeat handler.

Watch for: the handshake cannot carry an `Authorization` header, so the token
arrives as the first message; close unauthenticated sockets immediately. Always
remove a connection from the registry on disconnect or the dict leaks.

---

## 10. Error handling and migrations

**Files:** `main.py`, `migrations/env.py`

The validation handler reports every invalid field at once; the catch-all logs
the traceback and returns `SYS_001` with nothing internal in it. Then generate
the initial Alembic migration and confirm `upgrade head` builds all four tables
with their indexes.

---

## Working with an agent on these

One slice per session. Point it at the slice, the files, and
[`CODING_STYLE.md`](CODING_STYLE.md) — the `beepmydevice-backend` skill loads
the rules automatically. Ask for tests in the same pass, not afterwards; the
stub test names already describe the cases worth having.

The "watch for" notes above are the mistakes that are easy to make and hard to
notice — worth restating in the prompt for that slice.
