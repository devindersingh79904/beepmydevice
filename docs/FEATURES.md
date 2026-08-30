# Features

Phase 1 is the MVP: authenticate, register devices, alert them. Everything else
is deliberately deferred.

---

## Phase 1 — MVP (6–8 weeks)

### Authentication

- Email + password registration and login
- bcrypt password hashing
- JWT issue with a 30-day expiry
- Token validation on every protected endpoint
- Logout

### Guest access

- Auto-registration with no login, no approval, no setup
- A guest appears in the admin's device list immediately, badged "Guest"
- Guests **receive** alerts exactly like owned devices
- Guests **cannot send** alerts, cannot list devices, cannot read details
- The admin can remove any guest from their network

This is what makes the app useful for a visitor: their phone becomes findable
the moment they open it on the WiFi, without anyone setting anything up. The
restriction is structural, not cosmetic -- a guest holds a device-scoped token
that authorises only its own heartbeat, so it cannot authenticate at the alert
endpoint at all.

### Device management

- Registration on first app launch
- Platform detection: iOS, Android, Windows, macOS
- Push token acquisition — Firebase (Android), APNs (iOS)
- WiFi MAC (BSSID) read for the device's current network
- Heartbeat every 30 seconds carrying battery level and current MAC
- Derived status: `ONLINE`, `OFFLINE`, `UNKNOWN`
- Device removal
- Device list for the network admin

### Alerts

- Send to one device, several, or every device on the network (guests included)
- Three-stage authorization: shared network, admin rights, reachable targets
  (targets need not be owned -- guests have no owner)
- Routing through the correct push provider per platform
- Sound and vibration on the receiving device
- Per-device delivery status in the response
- Alert history with `SENT` / `RECEIVED` / `FAILED`

### Real-time status

- WebSocket connection for live updates
- Online/offline transitions
- Battery level changes
- Last-seen timestamps
- Connection-state indicator with automatic reconnection

### Screens

- Login and register
- Dashboard — device list with live status and Guest badges, send alerts
- Device detail
- Settings and profile
- Error banner rendering every error, auto-closing after 5 seconds

### Push notifications

- Firebase Cloud Messaging setup (Android)
- APNs setup with `.p8` token auth (iOS)
- Permission handling, including graceful denial
- Retry with backoff on transient failure
- Token refresh handling

---

## Phase 2 — Grouping and multi-admin

- Device groups, so an admin can alert "upstairs" or "the kids' devices"
- Selective alerts by group
- Multi-admin support — several household members with alert rights
- Guest approval, if open registration proves too permissive in practice
- Rate limiting on registration, to prevent device-list flooding
- Redis-backed WebSocket pub/sub, so the API can run more than one worker
- Rate limiting
- Device-to-network binding, so a device cannot re-bind without admin approval

## Phase 3 — Advanced

- WiFi network scanning to surface unregistered devices
- Custom alert sounds per device
- GPS location where available
- Alert statistics and usage history
- Smart device naming

---

## What this deliberately does not do

**Work off the home network.** The WiFi network *is* the authorization
boundary. Alerting a device elsewhere would remove the proximity guarantee that
makes the model safe, and it is what Find My already does well.

**Locate a device on a map.** This app makes noise. Finding a phone in the sofa
is the problem it solves; finding one in another city is not.

**Replace Find My.** It fills the gap Find My leaves — the multi-account
household — and is meant to sit alongside it.
