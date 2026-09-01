/**
 * Test environment.
 *
 * jsdom has no WebSocket and no matchMedia, and several components reach for
 * both. Stubbing them here rather than in each test keeps the mocks in one
 * place and stops a missing global from failing a test for a reason that has
 * nothing to do with what it is checking.
 */

import '@testing-library/jest-dom/vitest';
import {vi} from 'vitest';

/** A WebSocket that connects to nothing and never fires. */
class StubWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readyState = StubWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onmessage: ((event: {data: string}) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;

  send(): void {
    // The status socket only ever sends its token; nothing asserts on it.
  }

  close(): void {
    this.readyState = StubWebSocket.CLOSED;
  }
}

vi.stubGlobal('WebSocket', StubWebSocket);
