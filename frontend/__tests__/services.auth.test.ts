/** Tests for the auth service and the typed transport wrappers. */

import AsyncStorage from '@react-native-async-storage/async-storage';

import {API_ROUTES, STORAGE_KEYS} from '../src/utils/constants';

jest.mock('../src/utils/api-client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
  setUnauthorizedHandler: jest.fn(),
}));

const {apiClient} = require('../src/utils/api-client') as {
  apiClient: {
    get: jest.Mock;
    post: jest.Mock;
    put: jest.Mock;
    delete: jest.Mock;
  };
};
const api = require('../src/services/api') as typeof import('../src/services/api');
const authService = require('../src/services/auth') as typeof import('../src/services/auth');

/** The shape the api-client interceptor hands on: ApiData, already unwrapped. */
function unwrapped<T>(content: T, pagination?: unknown): {data: unknown} {
  return {data: pagination ? {content, pagination} : {content}};
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe('transport wrappers', () => {
  it('get returns data.content', async () => {
    apiClient.get.mockResolvedValue(unwrapped({device_id: 'd1'}));

    await expect(api.get('/devices/d1')).resolves.toEqual({device_id: 'd1'});
  });

  it('getPaginated splits items from the pagination block', async () => {
    const pagination = {
      current_page: 1,
      total_pages: 2,
      total_count: 30,
      page_size: 20,
      has_next: true,
      has_prev: false,
    };
    apiClient.get.mockResolvedValue(unwrapped([{device_id: 'd1'}], pagination));

    const result = await api.getPaginated('/devices/list');

    expect(result.items).toHaveLength(1);
    expect(result.pagination).toEqual(pagination);
  });

  it('getPaginated survives a response with no pagination block', async () => {
    apiClient.get.mockResolvedValue(unwrapped([{device_id: 'd1'}]));

    const result = await api.getPaginated('/devices/list');

    expect(result.pagination.total_count).toBe(1);
  });

  it('post and put return data.content', async () => {
    apiClient.post.mockResolvedValue(unwrapped({ok: true}));
    apiClient.put.mockResolvedValue(unwrapped({ok: false}));

    await expect(api.post('/x', {})).resolves.toEqual({ok: true});
    await expect(api.put('/x', {})).resolves.toEqual({ok: false});
  });

  it('remove issues a DELETE', async () => {
    apiClient.delete.mockResolvedValue(unwrapped(null));

    await api.remove('/devices/d1');

    expect(apiClient.delete).toHaveBeenCalledWith('/devices/d1');
  });
});

describe('isApiErrorArray', () => {
  it('accepts a real errors array', () => {
    expect(api.isApiErrorArray([{code: 'SYS_001', message: 'Boom'}])).toBe(true);
  });

  it.each([
    ['a plain error', new Error('nope')],
    ['a string', 'nope'],
    ['a malformed entry', [{code: 'SYS_001'}]],
  ])('rejects %s', (_label, value) => {
    expect(api.isApiErrorArray(value)).toBe(false);
  });
});

describe('auth service', () => {
  const credentials = {email: 'dev@example.com', password: 'CorrectHorse9'};
  const issued = {
    user_id: 'user-1',
    token: 'jwt-123',
    token_type: 'Bearer',
    expires_at: new Date().toISOString(),
  };

  it('register persists the token and the user', async () => {
    apiClient.post.mockResolvedValue(unwrapped(issued));

    await authService.register(credentials);

    await expect(authService.getStoredToken()).resolves.toBe('jwt-123');
    await expect(authService.getStoredUser()).resolves.toMatchObject({
      user_id: 'user-1',
      email: 'dev@example.com',
    });
  });

  it('login posts to the login route and persists the token', async () => {
    apiClient.post.mockResolvedValue(unwrapped(issued));

    await authService.login(credentials);

    expect(apiClient.post).toHaveBeenCalledWith(API_ROUTES.LOGIN, credentials);
    await expect(authService.getStoredToken()).resolves.toBe('jwt-123');
  });

  it('logout clears storage even when the network call fails', async () => {
    apiClient.post.mockResolvedValueOnce(unwrapped(issued));
    await authService.login(credentials);
    apiClient.post.mockRejectedValueOnce([
      {code: 'SYS_001', message: 'Server unreachable'},
    ]);

    await authService.logout();

    // The user asked to be signed out on this device; whether the server heard
    // about it is beside the point.
    await expect(authService.getStoredToken()).resolves.toBeNull();
    await expect(
      AsyncStorage.getItem(STORAGE_KEYS.USER),
    ).resolves.toBeNull();
  });

  it('returns null when nothing is stored', async () => {
    await expect(authService.getStoredToken()).resolves.toBeNull();
    await expect(authService.getStoredUser()).resolves.toBeNull();
  });
});
