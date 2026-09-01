/// <reference types="vitest" />
import {fileURLToPath, URL} from 'node:url';

import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';

/**
 * The dashboard is a pure client-side SPA: every screen sits behind a bearer
 * token held in the browser, so there is nothing for a server to render that
 * the client would not have to re-fetch anyway.
 *
 * `/api` and `/ws` are proxied in development so the browser sees one origin
 * and never trips CORS or a mixed-origin cookie rule. In production the same
 * two paths are proxied by nginx -- see README.md.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {'@': fileURLToPath(new URL('./src', import.meta.url))},
  },
  server: {
    port: 3000,
    proxy: {
      /**
       * `/api/v1/*` is rewritten away before it reaches the API.
       *
       * The backend mounts its routers at the root — `/auth/login`,
       * `/devices/list`, `/alerts/send` — with no version prefix. The browser
       * still has to ask for one, because this dashboard's own client routes
       * are `/devices` and `/alerts`: on a shared origin an unprefixed
       * `/devices` is ambiguous between a page and an endpoint, and whichever
       * the proxy resolved it to would be wrong half the time.
       *
       * So the prefix exists on the client side only, as a namespace, and is
       * stripped here. `nginx.conf` does the same with a trailing slash on
       * `proxy_pass`.
       */
      '/api/v1': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/v1/, ''),
      },
      // The socket needs no rewrite: the backend serves /ws/status itself.
      '/ws': {target: 'ws://127.0.0.1:8000', ws: true},
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {reporter: ['text', 'lcov'], include: ['src/**/*.{ts,tsx}']},
  },
});
