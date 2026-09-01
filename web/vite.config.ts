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
      '/api': {target: 'http://127.0.0.1:8000', changeOrigin: true},
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
