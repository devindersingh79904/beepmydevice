/**
 * `react-native-network-info` on the web — the shim that matters most.
 *
 * **`getBSSID()` returns null, deliberately, and always will.**
 *
 * There is no browser API that exposes the WiFi BSSID. Not behind a
 * permission prompt, not over HTTPS, not with a flag: the Network Information
 * API reports `effectiveType` and `downlink` and nothing that identifies the
 * network. This is a privacy decision by every browser vendor, not a gap
 * waiting to be filled.
 *
 * That matters more here than it would in most apps, because in BeepMyDevice
 * the BSSID *is* the security model. `AlertService.send_alert` authorizes
 * against the router MAC: devices sharing one `wifi_id` are one alert group,
 * and membership of that group is the whole permission. A device with no
 * BSSID cannot be a member.
 *
 * So the honest failure is null. The tempting alternatives are both worse:
 *
 *   A hard-coded MAC would register this browser onto a network it is not on,
 *   which is precisely the boundary the design exists to enforce — a device
 *   anywhere in the world could then be alerted by, and could join, a home it
 *   has never been near.
 *
 *   A random MAC would create a new single-member network on every page load,
 *   filling `wifi_networks` with rows nothing can ever join.
 *
 * With null, `useDeviceRegistration` declines to register and the app runs as
 * a signed-in browsing client: screens render, the device list loads, alerts
 * can be sent. This browser simply is not itself a target — which is correct,
 * since it could not ring anyway.
 */

import {getLogger} from '../../src/utils/logger';

const logger = getLogger('network-info.web');

let warned = false;

/** Warn once rather than on every poll. */
function warnOnce(): void {
  if (warned) {
    return;
  }
  warned = true;
  logger.warn(
    'No WiFi BSSID is available in a browser, so this client cannot join a ' +
      'network alert group or register as a device. Signing in and sending ' +
      'alerts still work.',
  );
}

export const NetworkInfo = {
  /** Always null on web. See the note above; this is not a stub to fill in. */
  getBSSID: async (): Promise<string | null> => {
    warnOnce();
    return null;
  },

  /** Also unavailable: the SSID is as identifying as the BSSID. */
  getSSID: async (): Promise<string | null> => {
    warnOnce();
    return null;
  },
};

export default {NetworkInfo};
