/**
 * `react-native-device-info` on the web.
 *
 * The package does ship a web build, but it reports the user agent, which is a
 * poor answer to the three questions this app asks. These implementations use
 * the browser APIs that exist and say plainly when one does not.
 */

const UNKNOWN_BATTERY = -1;

/** The subset of the Battery Status API this needs. */
interface BatteryManager {
  level: number;
}

interface NavigatorWithBattery extends Navigator {
  getBattery?: () => Promise<BatteryManager>;
}

export const DeviceInfo = {
  /**
   * The browser name, as a device name.
   *
   * There is no equivalent of "Devinder's iPhone" on the web — a page cannot
   * read the machine's name — so the browser is the most honest label for the
   * thing the user is looking at.
   */
  getDeviceName: async (): Promise<string> => {
    const agent = navigator.userAgent;
    if (agent.includes('Firefox/')) {
      return 'Firefox';
    }
    if (agent.includes('Edg/')) {
      return 'Edge';
    }
    if (agent.includes('Chrome/')) {
      return 'Chrome';
    }
    if (agent.includes('Safari/')) {
      return 'Safari';
    }
    return 'Browser';
  },

  /** The platform, where the browser will admit to one. */
  getSystemVersion: async (): Promise<string> => {
    const platform = (navigator as Navigator & {userAgentData?: {platform?: string}})
      .userAgentData?.platform;
    return platform ?? navigator.platform ?? 'web';
  },

  /**
   * Battery level as a 0–1 fraction, or -1 when unavailable.
   *
   * The Battery Status API is implemented in Chromium and removed from Firefox
   * and Safari on privacy grounds, so on most browsers this genuinely cannot
   * be answered. -1 is what the native library returns for "unknown", and the
   * app already treats it as absent — better than reporting a confident 100%.
   */
  getBatteryLevel: async (): Promise<number> => {
    const getBattery = (navigator as NavigatorWithBattery).getBattery;
    if (typeof getBattery !== 'function') {
      return UNKNOWN_BATTERY;
    }
    try {
      const battery = await getBattery.call(navigator);
      return battery.level;
    } catch {
      return UNKNOWN_BATTERY;
    }
  },
};

export default DeviceInfo;
