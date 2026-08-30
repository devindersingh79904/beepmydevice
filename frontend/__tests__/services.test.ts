/**
 * Tests for the service layer.
 *
 * The axios instance is mocked; no test performs a real network call.
 */

describe('api client', () => {
  it('attaches the Bearer token to every request', () => {
    throw new Error('Not implemented');
  });

  it('attaches the session correlation ID to every request', () => {
    throw new Error('Not implemented');
  });

  it('reuses one correlation ID for the whole session', () => {
    throw new Error('Not implemented');
  });

  it('unwraps data.content so callers never see the envelope', () => {
    throw new Error('Not implemented');
  });

  it('throws the errors array on a failed response', () => {
    throw new Error('Not implemented');
  });

  it('clears the stored token when any AUTH_ code is returned', () => {
    throw new Error('Not implemented');
  });
});

describe('device service', () => {
  it('returns null from getWifiMacAddress when location permission is denied', () => {
    throw new Error('Not implemented');
  });

  it('returns null from getBatteryLevel on platforms without a battery', () => {
    throw new Error('Not implemented');
  });
});

describe('alert service', () => {
  it('sends an empty device_ids array to target the whole network', () => {
    throw new Error('Not implemented');
  });

  it('surfaces per-device delivery status', () => {
    throw new Error('Not implemented');
  });
});

describe('websocket service', () => {
  it('sends the token as the first frame after connecting', () => {
    throw new Error('Not implemented');
  });

  it('backs off exponentially between reconnect attempts', () => {
    throw new Error('Not implemented');
  });

  it('stops retrying after WS_MAX_RECONNECT_ATTEMPTS', () => {
    throw new Error('Not implemented');
  });
});
