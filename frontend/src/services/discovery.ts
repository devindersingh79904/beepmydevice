/**
 * Finds what else is on this WiFi network.
 *
 * This runs on the phone because it can only run on the phone. The backend is
 * a cloud relay: a scan executed there enumerates the hosting provider's
 * network, not the user's home, and would never see a single device of theirs.
 * So a client that is actually on the network looks, and posts what it found.
 *
 * Two methods, because they find different things and neither finds much
 * alone:
 *
 * * **mDNS** asks the network who is advertising a service. It returns real
 *   names -- "Living Room TV", a printer's model number -- but only from
 *   devices that advertise, which means TVs, printers, speakers and casting
 *   targets. Phones and laptops advertise nothing.
 * * **Subnet sweep** opens an HTTP connection to every address in the /24 and
 *   records which ones answer. It finds routers, cameras, NAS boxes and
 *   anything with a web interface, and learns no name at all.
 *
 * The union is not the network, and this module does not pretend otherwise:
 * a phone with no open ports and nothing advertised is invisible to both, and
 * the UI says "discovered", never "all".
 */

import {NetworkInfo} from 'react-native-network-info';

import {
  MDNS_SERVICE_TYPES,
  MDNS_TIMEOUT_MS,
  SWEEP_CONCURRENCY,
  SWEEP_LAST_HOST,
  SWEEP_TIMEOUT_MS,
} from '@utils/constants';
import {getLogger} from '@utils/logger';

const logger = getLogger('discovery-service');

/** An IPv4 address has four octets; the first three are the /24 prefix. */
const IPV4_OCTETS = 4;

/** How an observation was made. Mirrors DiscoverySource on the server. */
export type DiscoverySource = 'MDNS' | 'SWEEP';

/** One thing seen on the network. */
export interface Observation {
  ip_address: string;
  device_name: string | null;
  device_type: string | null;
  discovered_via: DiscoverySource;
}

/** Name fragments that identify a kind of device, most specific first. */
const TYPE_HINTS: readonly (readonly [string, readonly string[]])[] = [
  ['printer', ['printer', 'print', 'officejet', 'deskjet', 'laserjet', 'ipp']],
  ['tv', ['tv', 'bravia', 'aquos', 'firestick', 'shield']],
  ['speaker', ['sonos', 'echo', 'homepod', 'speaker', 'soundbar', 'raop']],
  ['chromecast', ['chromecast', 'googlecast', 'nest', 'roku']],
  ['router', ['router', 'gateway', 'fritz', 'archer', 'netgear', 'unifi']],
  ['macos', ['macbook', 'imac', 'mac-mini']],
  ['ios', ['iphone', 'ipad']],
  ['android', ['android', 'pixel', 'galaxy']],
  ['windows', ['desktop', 'workstation', 'windows']],
];

/**
 * Guess what a device is from the name it advertises.
 *
 * A guess, and named as one. The string is whatever the device chose to call
 * itself, so this is a display hint and nothing branches on it.
 *
 * @param name Advertised name, or null when nothing was learned.
 * @returns A device type, or null when the name says nothing useful.
 */
export function identifyType(name: string | null): string | null {
  if (name === null) {
    return null;
  }
  const lowered = name.toLowerCase();
  for (const [type, fragments] of TYPE_HINTS) {
    if (fragments.some(fragment => lowered.includes(fragment))) {
      return type;
    }
  }
  return null;
}

/**
 * Derive the /24 prefix this phone is on.
 *
 * A /24 rather than the real mask, deliberately. Home routers hand out /24s
 * almost universally, and honouring an actual /16 would mean probing 65,534
 * addresses -- half an hour of scanning to find the same four devices.
 *
 * @returns Something like "192.168.1", or null when there is no IPv4 address.
 */
export async function getSubnetPrefix(): Promise<string | null> {
  const address = await NetworkInfo.getIPV4Address();
  if (address === null || address === undefined) {
    return null;
  }
  const octets = address.split('.');
  if (octets.length !== IPV4_OCTETS) {
    return null;
  }
  return octets.slice(0, IPV4_OCTETS - 1).join('.');
}

/**
 * Probe one address and report whether anything answered.
 *
 * The timeout is enforced with an AbortController and a timer, not by passing
 * `timeout` to fetch: fetch has no such option and silently ignores it, so the
 * request would instead sit on the platform's own TCP timeout of over a
 * minute. At 254 addresses that is the difference between eight seconds and
 * several hours.
 *
 * *Any* reply counts, including 401, 403 and 404. The question is whether
 * something is at this address, not whether it wants to serve us a page.
 */
async function probe(ip: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SWEEP_TIMEOUT_MS);
  try {
    await fetch(`http://${ip}/`, {
      method: 'HEAD',
      signal: controller.signal,
    });
    return true;
  } catch {
    // Aborted, refused, or unreachable. Only the first is common, and none of
    // them is worth logging 254 times.
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Run tasks with a bounded number in flight.
 *
 * Firing all 254 probes at once is not faster: the OS starts refusing sockets
 * and a phone's WiFi radio does not widen to meet demand. Workers pull from a
 * shared cursor so a slow address delays only itself.
 */
async function pooled<T>(
  tasks: readonly (() => Promise<T>)[],
  width: number,
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let cursor = 0;

  const worker = async (): Promise<void> => {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= tasks.length) {
        return;
      }
      results[index] = await tasks[index]();
    }
  };

  await Promise.all(
    Array.from({length: Math.min(width, tasks.length)}, () => worker()),
  );
  return results;
}

/**
 * Sweep the local /24 for addresses that answer on port 80.
 *
 * Finds things with a web interface and learns no name from any of them, which
 * is why the observations it returns carry a null name rather than an invented
 * one like "Device-42".
 */
export async function sweepSubnet(): Promise<Observation[]> {
  const prefix = await getSubnetPrefix();
  if (prefix === null) {
    logger.warn('No IPv4 address; cannot sweep the subnet');
    return [];
  }

  const hosts = Array.from({length: SWEEP_LAST_HOST}, (_, index) => index + 1);
  const answered = await pooled(
    hosts.map(host => async () => {
      const ip = `${prefix}.${host}`;
      return (await probe(ip)) ? ip : null;
    }),
    SWEEP_CONCURRENCY,
  );

  return answered
    .filter((ip): ip is string => ip !== null)
    .map(ip => ({
      ip_address: ip,
      device_name: null,
      device_type: null,
      discovered_via: 'SWEEP' as const,
    }));
}

/**
 * Listen for mDNS announcements across the service types a home network uses.
 *
 * Wrapped in its own try/catch and degrading to an empty list, because this is
 * the one part of the scan that depends on a native module. If Zeroconf is
 * missing or the platform refuses it, the sweep should still run rather than
 * the whole scan failing.
 */
export async function scanMdns(): Promise<Observation[]> {
  let Zeroconf;
  try {
    // Required lazily, and this is the one place the rule is worth breaking:
    // a static import is hoisted and would throw at module load on a build
    // where the native module is missing, before any guard can run. The whole
    // point of this branch is to survive that.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    Zeroconf = require('react-native-zeroconf').default;
  } catch {
    logger.warn('Zeroconf is unavailable; scanning by sweep only');
    return [];
  }

  const zeroconf = new Zeroconf();
  const found = new Map<string, Observation>();

  return new Promise<Observation[]>(resolve => {
    const finish = (): void => {
      try {
        zeroconf.stop();
        zeroconf.removeDeviceListeners();
      } catch {
        // Already torn down; nothing to do.
      }
      resolve([...found.values()]);
    };

    zeroconf.on('resolved', (service: Record<string, unknown>) => {
      const addresses = (service.addresses as string[] | undefined) ?? [];
      // IPv6 is filtered out: the server stores one address per row and the
      // sweep works in IPv4, so mixing families would double-count a device.
      const ip = addresses.find(address => address.includes('.'));
      if (ip === undefined) {
        return;
      }
      const name = (service.name as string | undefined) ?? null;
      found.set(ip, {
        ip_address: ip,
        device_name: name,
        device_type: identifyType(name),
        discovered_via: 'MDNS',
      });
    });

    zeroconf.on('error', (error: unknown) => {
      logger.warn('mDNS reported an error; keeping what was found', {
        error: String(error),
      });
    });

    for (const type of MDNS_SERVICE_TYPES) {
      try {
        zeroconf.scan(type, 'tcp', 'local.');
      } catch {
        logger.warn(`Could not scan for _${type}._tcp`);
      }
    }

    // mDNS has no "done": responders answer whenever they feel like it, so a
    // scan ends when we stop listening rather than when the network says so.
    setTimeout(finish, MDNS_TIMEOUT_MS);
  });
}

/**
 * Run both scans and merge them.
 *
 * mDNS wins on a collision. Both find the router, and only one of them knows
 * what it is called.
 *
 * @returns Everything seen, one entry per address.
 */
export async function scanNetwork(): Promise<Observation[]> {
  // Sequential, not concurrent. Both compete for the same radio, and a sweep
  // saturating it is a good way to make mDNS responses arrive after the
  // listening window has closed.
  const named = await scanMdns();
  const swept = await sweepSubnet();

  const merged = new Map<string, Observation>();
  for (const observation of swept) {
    merged.set(observation.ip_address, observation);
  }
  for (const observation of named) {
    merged.set(observation.ip_address, observation);
  }

  logger.info(
    `Discovered ${merged.size} device(s): ${named.length} named, ${swept.length} by sweep`,
  );
  return [...merged.values()];
}
