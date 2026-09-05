package com.beepmydevice

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build

/**
 * The two notification channels an alert can be delivered on.
 *
 * This exists because of one Android rule: when the app is backgrounded or
 * dead, the app does not run at all -- the system draws the notification and
 * plays the sound, using only what the *channel* says. Which is the whole
 * product. Nobody is holding the phone they have lost, so the ringing path
 * that matters is the one where no JavaScript ever executes.
 *
 * Two channels rather than one with a flag, because Android freezes a
 * channel's importance and audio attributes at creation and silently ignores
 * every later change. Their ids are a wire contract with the backend -- see
 * ANDROID_CHANNEL_ALERT in backend/src/utils/constants.py -- and are versioned
 * for that reason: changing how an alert sounds means publishing a new id, not
 * editing this file, because the old channel will never take the edit.
 */
object AlertChannels {

  private val VIBRATION_PATTERN = longArrayOf(0, 500, 200, 500, 200, 500)

  /**
   * Declare both channels. Safe to call on every launch: creating a channel
   * that already exists is a no-op, which is also why an edit here does not
   * reach an install that has already run.
   */
  @JvmStatic
  fun register(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      // Channels did not exist before Oreo; the notification payload carries
      // the sound instead, which the backend also sets.
      return
    }

    val manager = context.getSystemService(NotificationManager::class.java) ?: return
    val sound = Uri.parse("android.resource://${context.packageName}/${R.raw.alert}")

    manager.createNotificationChannel(
        NotificationChannel(
                context.getString(R.string.alert_channel_id),
                "Device alerts",
                NotificationManager.IMPORTANCE_HIGH,
            )
            .apply {
              description = "Someone on your WiFi is trying to find this device."
              enableVibration(true)
              vibrationPattern = VIBRATION_PATTERN
              setSound(
                  sound,
                  AudioAttributes.Builder()
                      .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                      .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                      .build(),
              )
            })

    manager.createNotificationChannel(
        NotificationChannel(
                context.getString(R.string.alert_channel_id_silent_override),
                "Device alerts (override silent)",
                NotificationManager.IMPORTANCE_HIGH,
            )
            .apply {
              description = "Alerts that stay audible when this phone is on silent."
              enableVibration(true)
              vibrationPattern = VIBRATION_PATTERN
              // USAGE_ALARM is what actually does it: the alarm stream is not
              // muted by the ringer switch, which is why an alarm still goes
              // off on a silenced phone. Nothing else here overrides silent.
              setSound(
                  sound,
                  AudioAttributes.Builder()
                      .setUsage(AudioAttributes.USAGE_ALARM)
                      .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                      .build(),
              )
              // Best effort: honoured only if the user grants Do Not Disturb
              // access. Ignored without it, and no error is reported either
              // way, so this is not something to rely on.
              setBypassDnd(true)
              lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
            })
  }
}
