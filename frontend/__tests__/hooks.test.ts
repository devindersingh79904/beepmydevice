/** Tests for the custom hooks. */

describe('useAuth', () => {
  it('throws when used outside an AuthProvider', () => {
    throw new Error('Not implemented');
  });

  it('restores a persisted session on mount', () => {
    throw new Error('Not implemented');
  });

  it('clears local state on logout even if the network call fails', () => {
    throw new Error('Not implemented');
  });
});

describe('useDevices', () => {
  it('applies WebSocket status updates without refetching', () => {
    throw new Error('Not implemented');
  });

  it('applies battery updates in place', () => {
    throw new Error('Not implemented');
  });
});

describe('useErrors', () => {
  it('auto-clears errors after ERROR_AUTO_CLOSE_MS', () => {
    throw new Error('Not implemented');
  });

  it('maps VAL_ errors onto fieldErrors by field name', () => {
    throw new Error('Not implemented');
  });
});
