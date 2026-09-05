/**
 * Tests for the service layer.
 *
 * The axios instance is mocked; no test performs a real network call.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type {AxiosAdapter, AxiosResponse} from 'axios';
import {AxiosError} from 'axios';
import {PermissionsAndroid, Platform} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import {NetworkInfo} from 'react-native-network-info';

import type {ApiResponse} from '../src/types/api';
import {createApiClient} from '../src/utils/api-client';
import {
  AUTHORIZATION_HEADER,
  CORRELATION_ID_HEADER,
  STORAGE_KEYS,
  WS_MAX_RECONNECT_ATTEMPTS,
  WS_RECONNECT_BASE_DELAY_MS,
} from '../src/utils/constants';
import {getBatteryLevel, getWifiMacAddress} from '../src/services/device';
import * as websocketService from '../src/services/websocket';

jest.mock('../src/services/api', () => ({
  post: jest.fn(),
  get: jest.fn(),
  put: jest.fn(),
  remove: jest.fn(),
  getPaginated: jest.fn(),
  isApiErrorArray: jest.requireActual('../src/services/api').isApiErrorArray,
}));

/** Build a success envelope the way the backend does. */
function envelope<T>(content: T): ApiResponse<T> {
  return {
    success: true,
    status_code: 200,
    data: {content},
    errors: [],
    correlation_id: 'test-correlation-id',
    timestamp: new Date().toISOString(),
  };
}

/** An adapter that records the outgoing config and replies with `body`. */
function respondWith<T>(body: ApiResponse<T>): {
  adapter: AxiosAdapter;
  seen: {headers: Record<string, string>}[];
} {
  const seen: {headers: Record<string, string>}[] = [];
  const adapter: AxiosAdapter = async config => {
    seen.push({headers: config.headers as unknown as Record<string, string>});
    return {
      data: body,
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    } as AxiosResponse;
  };
  return {adapter, seen};
}

describe('api client', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it('attaches the Bearer token to every request', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, JSON.stringify('jwt-123'));
    const client = createApiClient();
    const {adapter, seen} = respondWith(envelope({ok: true}));
    client.defaults.adapter = adapter;

    await client.get('/devices/list');

    expect(seen[0].headers[AUTHORIZATION_HEADER]).toBe('Bearer jwt-123');
  });

  it('attaches the session correlation ID to every request', async () => {
    const client = createApiClient();
    const {adapter, seen} = respondWith(envelope({ok: true}));
    client.defaults.adapter = adapter;

    await client.get('/devices/list');

    expect(seen[0].headers[CORRELATION_ID_HEADER]).toBeTruthy();
  });

  it('reuses one correlation ID for the whole session', async () => {
    const client = createApiClient();
    const {adapter, seen} = respondWith(envelope({ok: true}));
    client.defaults.adapter = adapter;

    await client.get('/devices/list');
    await client.get('/alerts/logs');

    expect(seen[0].headers[CORRELATION_ID_HEADER]).toBe(
      seen[1].headers[CORRELATION_ID_HEADER],
    );
  });

  it('unwraps data.content so callers never see the envelope', async () => {
    const client = createApiClient();
    const {adapter} = respondWith(envelope({device_id: 'abc'}));
    client.defaults.adapter = adapter;

    const response = await client.get('/devices/abc');

    expect(response.data).toEqual({content: {device_id: 'abc'}});
  });

  it('throws the errors array on a failed response', async () => {
    const client = createApiClient();
    const failure: ApiResponse<null> = {
      success: false,
      status_code: 400,
      data: null,
      errors: [{code: 'ALERT_002', message: 'No devices available to alert'}],
      correlation_id: 'test-correlation-id',
      timestamp: new Date().toISOString(),
    };
    client.defaults.adapter = async config => {
      throw new AxiosError('Bad Request', 'ERR_BAD_REQUEST', config, null, {
        data: failure,
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config,
      } as AxiosResponse);
    };

    await expect(client.post('/alerts/send', {})).rejects.toEqual([
      {code: 'ALERT_002', message: 'No devices available to alert'},
    ]);
  });

  it('keeps the session when the server denies permission', async () => {
    // AUTH_004 is a 403 from a valid token -- asking for a network another
    // account administers. Logging out here signed the user out mid-use.
    await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, JSON.stringify('jwt-123'));
    const client = createApiClient();
    const failure: ApiResponse<null> = {
      success: false,
      status_code: 403,
      data: null,
      errors: [
        {code: 'AUTH_004', message: 'You are not authorized to perform this action'},
      ],
      correlation_id: 'test-correlation-id',
      timestamp: new Date().toISOString(),
    };
    client.defaults.adapter = async config => {
      throw new AxiosError('Forbidden', 'ERR_BAD_REQUEST', config, null, {
        data: failure,
        status: 403,
        statusText: 'Forbidden',
        headers: {},
        config,
      } as AxiosResponse);
    };

    await expect(client.get('/devices/list')).rejects.toBeTruthy();

    await expect(
      AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN),
    ).resolves.toContain('jwt-123');
  });

  it('clears the stored token when the session has genuinely ended', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, JSON.stringify('jwt-123'));
    const client = createApiClient();
    const failure: ApiResponse<null> = {
      success: false,
      status_code: 401,
      data: null,
      errors: [{code: 'AUTH_002', message: 'Your session has expired'}],
      correlation_id: 'test-correlation-id',
      timestamp: new Date().toISOString(),
    };
    client.defaults.adapter = async config => {
      throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, {
        data: failure,
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config,
      } as AxiosResponse);
    };

    await expect(client.get('/devices/list')).rejects.toBeTruthy();

    expect(await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)).toBeNull();
  });
});

describe('device service', () => {
  it('returns null from getWifiMacAddress when location permission is denied', async () => {
    Platform.OS = 'android';
    jest
      .spyOn(PermissionsAndroid, 'request')
      .mockResolvedValue(PermissionsAndroid.RESULTS.DENIED);

    await expect(getWifiMacAddress()).resolves.toBeNull();
  });

  it('returns null from getBatteryLevel on platforms without a battery', async () => {
    // -1 is what DeviceInfo reports when the platform has no battery.
    jest.spyOn(DeviceInfo, 'getBatteryLevel').mockResolvedValue(-1);

    await expect(getBatteryLevel()).resolves.toBeNull();
  });

  it('normalises the BSSID so it matches what the backend stored', async () => {
    Platform.OS = 'ios';
    jest.spyOn(NetworkInfo, 'getBSSID').mockResolvedValue('00-1a-2b-3c-4d-5e');

    await expect(getWifiMacAddress()).resolves.toBe('00:1A:2B:3C:4D:5E');
  });
});

describe('alert service', () => {
  // services/api is mocked for this block only; the api-client tests above go
  // through the real interceptors via a stubbed axios adapter instead.
  const apiModule = require('../src/services/api') as {
    post: jest.Mock;
    getPaginated: jest.Mock;
  };
  const alertModule = require('../src/services/alert') as typeof import('../src/services/alert');

  beforeEach(() => {
    apiModule.post.mockReset();
    apiModule.getPaginated.mockReset();
  });

  it('sends an empty device_ids array to target the whole network', async () => {
    apiModule.post.mockResolvedValue({alert_id: 'a1', delivery_status: []});

    await alertModule.sendAlert({device_ids: []});

    expect(apiModule.post).toHaveBeenCalledWith('/alerts/send', {device_ids: []});
  });

  it('surfaces per-device delivery status', async () => {
    const delivery = [
      {device_id: 'd1', device_name: 'One', status: 'SENT', error_code: null},
      {
        device_id: 'd2',
        device_name: 'Two',
        status: 'FAILED',
        error_code: 'ALERT_004',
      },
    ];
    apiModule.post.mockResolvedValue({alert_id: 'a1', delivery_status: delivery});

    const result = await alertModule.sendAlert({device_ids: ['d1', 'd2']});

    expect(result.delivery_status).toEqual(delivery);
  });
});

describe('websocket service', () => {
  class FakeSocket {
    static instances: FakeSocket[] = [];
    onopen: (() => void) | null = null;
    onmessage: ((event: {data: string}) => void) | null = null;
    onerror: (() => void) | null = null;
    onclose: (() => void) | null = null;
    sent: string[] = [];

    constructor(public url: string) {
      FakeSocket.instances.push(this);
    }

    send(frame: string): void {
      this.sent.push(frame);
    }

    close(): void {
      this.onclose?.();
    }
  }

  beforeEach(() => {
    jest.useFakeTimers();
    FakeSocket.instances = [];
    (global as unknown as {WebSocket: unknown}).WebSocket = FakeSocket;
  });

  afterEach(() => {
    websocketService.disconnect();
    jest.useRealTimers();
  });

  it('sends the token as the first frame after connecting', () => {
    websocketService.connect('jwt-123');
    FakeSocket.instances[0].onopen?.();

    expect(FakeSocket.instances[0].sent).toEqual(['jwt-123']);
  });

  it('backs off exponentially between reconnect attempts', () => {
    websocketService.connect('jwt-123');

    FakeSocket.instances[0].onclose?.();
    jest.advanceTimersByTime(WS_RECONNECT_BASE_DELAY_MS);
    expect(FakeSocket.instances).toHaveLength(2);

    // The second wait is double the first, so advancing by the base delay
    // alone must not be enough to open a third socket.
    FakeSocket.instances[1].onclose?.();
    jest.advanceTimersByTime(WS_RECONNECT_BASE_DELAY_MS);
    expect(FakeSocket.instances).toHaveLength(2);

    jest.advanceTimersByTime(WS_RECONNECT_BASE_DELAY_MS);
    expect(FakeSocket.instances).toHaveLength(3);
  });

  it('stops retrying after WS_MAX_RECONNECT_ATTEMPTS', () => {
    websocketService.connect('jwt-123');

    for (let attempt = 0; attempt <= WS_MAX_RECONNECT_ATTEMPTS + 1; attempt += 1) {
      FakeSocket.instances[FakeSocket.instances.length - 1].onclose?.();
      jest.runOnlyPendingTimers();
    }

    expect(FakeSocket.instances.length).toBeLessThanOrEqual(
      WS_MAX_RECONNECT_ATTEMPTS + 1,
    );
  });
});
