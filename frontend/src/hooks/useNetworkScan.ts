/**
 * Scans this WiFi network and reports what it found to the server.
 *
 * The scan runs here rather than on the backend because it can only run here:
 * the API is a cloud relay, and a scan executed there enumerates the hosting
 * provider's network rather than the user's home.
 *
 * Never automatic. It takes seconds, saturates the WiFi radio, and opens a
 * connection to every address on the network -- none of which is a thing to do
 * behind the user's back on a timer.
 */

import {useCallback, useRef, useState} from 'react';

import * as deviceService from '@services/device';
import {scanNetwork} from '@services/discovery';
import {getLogger} from '@utils/logger';

const logger = getLogger('use-network-scan');

export interface UseNetworkScanResult {
  isScanning: boolean;
  /**
   * Run a scan and submit it.
   *
   * @returns How many devices were recorded, or null if the scan could not
   *   run. Null is not zero: an empty network and a scan that never started
   *   are different things and the caller has to be able to say so.
   */
  scan: () => Promise<number | null>;
}

export function useNetworkScan(): UseNetworkScanResult {
  const [isScanning, setScanning] = useState(false);
  // A second scan while the first is in flight would double the socket load
  // for no new information, and the button is easy to press twice.
  const inFlight = useRef(false);

  const scan = useCallback(async (): Promise<number | null> => {
    if (inFlight.current) {
      return null;
    }
    inFlight.current = true;
    setScanning(true);

    try {
      // Read before scanning, not after: the submission is refused unless the
      // MAC names a network this account administers, so there is no point
      // spending ten seconds on a scan that cannot be filed.
      const wifiMac = await deviceService.getWifiMacAddress();
      if (wifiMac === null) {
        logger.warn('No WiFi MAC available; cannot scan');
        return null;
      }

      const found = await scanNetwork();
      return await deviceService.submitScan(wifiMac, found);
    } catch (error) {
      logger.error('Network scan failed', error);
      return null;
    } finally {
      inFlight.current = false;
      setScanning(false);
    }
  }, []);

  return {isScanning, scan};
}
