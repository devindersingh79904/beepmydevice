/**
 * Push notification setup and the alert reaction.
 *
 * Registration differs by platform (Firebase on Android, native APNs on iOS)
 * but both funnel into one push token that the backend stores per device.
 */

/**
 * Request notification permission and return the push token.
 *
 * Returns null when the user declines -- the device is still registered and
 * visible on the dashboard, but cannot be alerted, and the UI must say so.
 */
export async function requestPermissionAndGetToken(): Promise<string | null> {
  throw new Error('Not implemented');
}

/**
 * Start listening for incoming alerts.
 *
 * On receipt the device plays the alert sound at full volume and vibrates,
 * ignoring the silent switch -- an alert the owner cannot hear defeats the
 * entire purpose of the app.
 */
export function startListening(): void {
  throw new Error('Not implemented');
}

/** Stop listening. Called on logout. */
export function stopListening(): void {
  throw new Error('Not implemented');
}

/**
 * Register a callback for token rotation.
 *
 * The platform can rotate the token at any time; the new value must be pushed
 * to the backend immediately or alerts silently stop arriving.
 */
export function onTokenRefresh(callback: (token: string) => void): () => void {
  throw new Error('Not implemented');
}
