# Push notification setup

Everything on both sides is wired and tested. What is left is credentials:
this document is the whole of it.

Until they are in place the app behaves exactly as it will afterwards, with one
difference — `NotificationService` logs what it *would* have sent instead of
sending it. Alerts still authorize, record and report; the target device simply
does not ring. Nothing fails silently: every skipped send is logged at WARNING.

---

## What is already done

| Piece | Where |
|---|---|
| FCM + APNs adapters, provider chosen by device type | `backend/src/services/notification_service.py` |
| APNs over HTTP/2 with a signed `.p8` provider token, cached ~45 min | same file |
| Push token captured at registration and refreshed when the platform rotates it | `frontend/src/services/notification.ts`, `hooks/usePushNotifications.ts` |
| Ring at full volume, override silent switch, vibrate | `frontend/src/services/notification.ts` |
| Alert sound bundled | `frontend/assets/sounds/alert.wav`, linked into both platforms |
| Owner's notification preference honoured before sending | `NotificationService.send_alert_to` |
| Gradle plugin, manifest permissions, `UIBackgroundModes`, bundle IDs | `frontend/android`, `frontend/ios` |

The iOS bundle identifier is **`com.beepmydevice.app`** and the Android
`applicationId` is **`com.beepmydevice`**. The APNs topic must match the iOS
bundle identifier exactly or delivery fails silently — the single most common
cause of "push just doesn't arrive".

---

## Firebase (Android, and iOS delivery)

1. Create a project at <https://console.firebase.google.com> (any name).
2. **Add an Android app** with package name `com.beepmydevice`.
   Download `google-services.json` → `frontend/android/app/google-services.json`.
3. **Add an iOS app** with bundle ID `com.beepmydevice.app`.
   Download `GoogleService-Info.plist` →
   `frontend/ios/BeepMyDevice/GoogleService-Info.plist`, then add it to the
   Xcode project (drag into the `BeepMyDevice` group, "Copy items if needed").
4. **Project settings → Service accounts → Generate new private key.** From the
   JSON it downloads, fill `backend/.env`:

   ```
   FIREBASE_PROJECT_ID=<project_id>
   FIREBASE_PRIVATE_KEY_ID=<private_key_id>
   FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n…\n-----END PRIVATE KEY-----\n
   FIREBASE_CLIENT_EMAIL=<client_email>
   ```

   Keep the `\n` escapes literal — the config layer converts them back.

Both credential files are gitignored. They are deployment configuration, not
source.

## APNs (iOS)

1. Apple Developer → **Certificates, Identifiers & Profiles → Keys → +**.
2. Enable **Apple Push Notifications service (APNs)**, create, and download
   `AuthKey_XXXXXXXXXX.p8`. Apple lets you download it **once**.
3. Put it at `backend/AuthKey_XXXXXXXXXX.p8` (gitignored) and fill `.env`:

   ```
   APPLE_TEAM_ID=<10-character team ID>
   APPLE_KEY_ID=<10-character key ID, the XXXXXXXXXX in the filename>
   APPLE_KEY_PATH=./AuthKey_XXXXXXXXXX.p8
   APPLE_BUNDLE_ID=com.beepmydevice.app
   APPLE_USE_SANDBOX=true
   ```

   `APPLE_USE_SANDBOX` must be `true` for debug builds and `false` for
   TestFlight and the App Store. A token minted for one is rejected by the
   other, which is why push often "works in TestFlight only".

4. In the Identifiers entry for `com.beepmydevice.app`, enable the **Push
   Notifications** capability, and add it in Xcode under Signing &
   Capabilities.

---

## Verifying

`settings.firebase_enabled` and `settings.apns_enabled` report whether each
provider has enough configuration to be used:

```bash
cd backend
.venv/Scripts/python -c "from src.config import settings; print('firebase:', settings.firebase_enabled, '| apns:', settings.apns_enabled)"
```

Then, with the app installed on a real device (push does not work on the iOS
simulator) and a second device on the same WiFi:

1. Sign in on one device, open the app on the other.
2. Both appear in the dashboard; the second is badged **Guest** if it has no
   account.
3. Send an alert. The target should ring at full volume even on silent.

If nothing arrives, check the API log first — a skipped send always says why.

---

## Optional: password reset email

The reset flow is implemented and tested. With no SMTP configured the link is
written to the log instead of emailed, which is enough to exercise the flow in
development. To actually send:

```
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=…
SMTP_PASSWORD=…
SMTP_FROM_ADDRESS=no-reply@yourdomain
PASSWORD_RESET_URL_BASE=https://app.yourdomain/reset-password
```
