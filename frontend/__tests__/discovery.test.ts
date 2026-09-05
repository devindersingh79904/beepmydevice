/**
 * Tests for the WiFi scanner.
 *
 * The two things worth pinning down are the ones that would be silently wrong
 * in production and pass a naive test: that a probe actually gives up (fetch
 * ignores a `timeout` option, so an unbounded probe waits on the platform's
 * own TCP timeout), and that the sweep never fabricates a name for something
 * it could not identify.
 */

import {
  getSubnetPrefix,
  identifyType,
  scanNetwork,
  sweepSubnet,
} from '../src/services/discovery';
import {
  MDNS_TIMEOUT_MS,
  SWEEP_CONCURRENCY,
  SWEEP_LAST_HOST,
  SWEEP_TIMEOUT_MS,
} from '../src/utils/constants';

/**
 * Long enough for every probe in a sweep to have timed out.
 *
 * The sweep runs SWEEP_CONCURRENCY at a time, so a subnet of entirely dead
 * addresses takes that many rounds of SWEEP_TIMEOUT_MS. Real time here would
 * be about ten seconds, past Jest's default, which is why these run on fake
 * timers rather than a raised timeout: waiting out a deliberate delay is not
 * the same as testing it.
 */
const WHOLE_SWEEP_MS =
  SWEEP_TIMEOUT_MS * Math.ceil(SWEEP_LAST_HOST / SWEEP_CONCURRENCY) +
  SWEEP_TIMEOUT_MS;

const {NetworkInfo} = jest.requireMock('react-native-network-info');

describe('identifyType', () => {
  it('reads a kind out of an advertised name', () => {
    expect(identifyType('HP OfficeJet Pro')).toBe('printer');
    expect(identifyType('Living Room TV')).toBe('tv');
    expect(identifyType('Sonos Beam')).toBe('speaker');
  });

  it('is case insensitive, because device names are not consistent', () => {
    expect(identifyType('LIVING ROOM TV')).toBe('tv');
  });

  it('returns null rather than guessing when the name says nothing', () => {
    // A wrong badge is worse than no badge: the user reads it as a fact about
    // their network.
    expect(identifyType('BRW9C305B')).toBeNull();
    expect(identifyType(null)).toBeNull();
  });
});

describe('getSubnetPrefix', () => {
  it('takes the first three octets', async () => {
    NetworkInfo.getIPV4Address.mockResolvedValueOnce('192.168.1.42');

    expect(await getSubnetPrefix()).toBe('192.168.1');
  });

  it('returns null when the phone has no IPv4 address', async () => {
    NetworkInfo.getIPV4Address.mockResolvedValueOnce(null);

    expect(await getSubnetPrefix()).toBeNull();
  });

  it('returns null for something that is not an IPv4 address', async () => {
    NetworkInfo.getIPV4Address.mockResolvedValueOnce('fe80::1');

    expect(await getSubnetPrefix()).toBeNull();
  });
});

describe('sweepSubnet', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
  });

  it('reports only the addresses that answered', async () => {
    global.fetch = jest.fn(async (url: string) => {
      if (url === 'http://192.168.1.7/') {
        return {ok: true} as Response;
      }
      throw new Error('unreachable');
    }) as unknown as typeof fetch;

    const found = await sweepSubnet();

    expect(found).toHaveLength(1);
    expect(found[0].ip_address).toBe('192.168.1.7');
  });

  it('counts any reply, not only a successful one', async () => {
    // A router answering 401 is still a router. The question is whether
    // something is at the address, not whether it will serve us a page.
    global.fetch = jest.fn(async (url: string) => {
      if (url === 'http://192.168.1.1/') {
        return {ok: false, status: 401} as Response;
      }
      throw new Error('unreachable');
    }) as unknown as typeof fetch;

    const found = await sweepSubnet();

    expect(found.map(item => item.ip_address)).toEqual(['192.168.1.1']);
  });

  it('never invents a name for something it only pinged', async () => {
    global.fetch = jest.fn(async (url: string) =>
      url === 'http://192.168.1.7/'
        ? ({ok: true} as Response)
        : Promise.reject(new Error('unreachable')),
    ) as unknown as typeof fetch;

    const [found] = await sweepSubnet();

    // "Device-7" would be the client lying to the dashboard about what it
    // knows. The server stores the null and the UI renders "unnamed".
    expect(found.device_name).toBeNull();
    expect(found.device_type).toBeNull();
    expect(found.discovered_via).toBe('SWEEP');
  });

  it('probes the whole /24 and neither the network nor broadcast address', async () => {
    const seen: string[] = [];
    global.fetch = jest.fn(async (url: string) => {
      seen.push(url);
      throw new Error('unreachable');
    }) as unknown as typeof fetch;

    await sweepSubnet();

    expect(seen).toHaveLength(SWEEP_LAST_HOST);
    expect(seen).toContain('http://192.168.1.1/');
    expect(seen).toContain(`http://192.168.1.${SWEEP_LAST_HOST}/`);
    expect(seen).not.toContain('http://192.168.1.0/');
    expect(seen).not.toContain('http://192.168.1.255/');
  });

  it('aborts a probe that never answers', async () => {
    // The reason this matters: fetch has no `timeout` option and ignores one
    // silently, so without the AbortController a single dead address holds the
    // scan for the platform's TCP timeout -- over a minute, 254 times over.
    jest.useFakeTimers();
    let aborted = false;
    global.fetch = jest.fn(
      (_url: string, init: {signal: AbortSignal}) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () => {
            aborted = true;
            reject(new Error('aborted'));
          });
        }),
    ) as unknown as typeof fetch;

    const sweeping = sweepSubnet();
    await jest.advanceTimersByTimeAsync(WHOLE_SWEEP_MS);

    expect(await sweeping).toEqual([]);
    expect(aborted).toBe(true);
  });

  it('gives up on the whole sweep when there is no IPv4 address', async () => {
    NetworkInfo.getIPV4Address.mockResolvedValueOnce(null);
    global.fetch = jest.fn() as unknown as typeof fetch;

    expect(await sweepSubnet()).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('scanNetwork', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    // mDNS has no "done" -- responders answer whenever they like, so the scan
    // ends on a timer. Advancing it is the only way to reach the result.
    jest.useFakeTimers();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
  });

  it('prefers the named result when both methods find one address', async () => {
    const Zeroconf = jest.requireMock('react-native-zeroconf').default;
    Zeroconf.mockImplementationOnce(() => ({
      on: (event: string, handler: (service: unknown) => void) => {
        if (event === 'resolved') {
          handler({name: 'Living Room TV', addresses: ['192.168.1.7']});
        }
      },
      scan: jest.fn(),
      stop: jest.fn(),
      removeDeviceListeners: jest.fn(),
    }));
    global.fetch = jest.fn(async (url: string) =>
      url === 'http://192.168.1.7/'
        ? ({ok: true} as Response)
        : Promise.reject(new Error('unreachable')),
    ) as unknown as typeof fetch;

    const scanning = scanNetwork();
    await jest.advanceTimersByTimeAsync(MDNS_TIMEOUT_MS + WHOLE_SWEEP_MS);
    const found = await scanning;

    // Both find the same address. Only one of them knows what it is called.
    expect(found).toHaveLength(1);
    expect(found[0].device_name).toBe('Living Room TV');
    expect(found[0].discovered_via).toBe('MDNS');
  });

  it('still sweeps when mDNS finds nothing at all', async () => {
    global.fetch = jest.fn(async (url: string) =>
      url === 'http://192.168.1.9/'
        ? ({ok: true} as Response)
        : Promise.reject(new Error('unreachable')),
    ) as unknown as typeof fetch;

    const scanning = scanNetwork();
    await jest.advanceTimersByTimeAsync(MDNS_TIMEOUT_MS + WHOLE_SWEEP_MS);
    const found = await scanning;

    expect(found.map(item => item.ip_address)).toEqual(['192.168.1.9']);
  });
});
