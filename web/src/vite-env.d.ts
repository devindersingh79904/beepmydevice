/// <reference types="vite/client" />

/**
 * Typed view of the environment Vite inlines at build time.
 *
 * Declaring the variables makes a typo a compile error rather than an
 * `undefined` baseURL that only shows up as a request to the wrong origin.
 */
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_WS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
