/**
 * The mobile app, rendered in a browser.
 *
 * Vite rather than webpack, and no Expo: this is a **bare React Native CLI
 * project**, so `expo start --web` and `expo export --platform web` cannot run
 * here at all — they need an Expo-managed project with the Expo config plugin
 * chain installed. That distinction is the single most common wrong turn when
 * adding web to an RN app.
 *
 * Three things have to be arranged for RN source to compile for a browser:
 *
 *   1. `react-native` must resolve to `react-native-web`.
 *   2. `.web.tsx` must win over `.tsx`, so a platform-specific file can
 *      override a native one.
 *   3. Everything under `node_modules` that ships untranspiled Flow-typed
 *      source — which is most of the React Native ecosystem — has to go
 *      through the transform, not be treated as pre-built ESM.
 *
 * **What this build cannot do.** A browser has no API for reading the WiFi
 * BSSID at any permission level, and no native push. The BSSID *is* the alert
 * group's identity, so this build can sign in and browse, but it cannot
 * register itself as a device and it cannot be alerted. See `shims/README.md`.
 * The dashboard in `web/` is the supported browser experience.
 */

import {fileURLToPath, URL} from 'node:url';

import react from '@vitejs/plugin-react';
import {transform} from 'esbuild';
import {defineConfig} from 'vite';
import type {Plugin} from 'vite';

const root = fileURLToPath(new URL('..', import.meta.url));
const here = fileURLToPath(new URL('.', import.meta.url));

/** Resolve a path against the frontend package root. */
const fromRoot = (segment: string): string => fileURLToPath(new URL(segment, `file://${root}`));

/** Resolve a path against this web/ directory. */
const fromHere = (segment: string): string => fileURLToPath(new URL(segment, `file://${here}`));

/**
 * Transform the JSX that React Native packages ship inside plain `.js` files.
 *
 * Rollup parses `.js` as standard JavaScript and stops at the first `<`, and
 * most of the React Native ecosystem publishes untranspiled source.
 *
 * Deliberately a `transform` hook scoped by id, and NOT a global
 * `esbuild.include` override. Setting that option replaces Vite's own default,
 * which is what compiles the app's `.ts` and `.tsx` — so overriding it makes
 * every component under `src/` fail to parse, with an error that points at the
 * component rather than at the config that broke it.
 */
function reactNativeJsx(): Plugin {
  const target = /node_modules[/\\](react-native|@react-native|react-native-[^/\\]+)[/\\].*\.js$/;

  /**
   * Flow's type-only statements, which esbuild has no loader for.
   *
   * React Native's codegen specs (`NativeRNVectorIcons.js`,
   * `codegenNativeComponent.js` and their kin) are Flow, and esbuild stops at
   * `import type {TurboModule} from …`. They describe TurboModules — native
   * bridges that do not exist in a browser and are never reached at runtime —
   * so erasing the type lines is enough to let the file parse. It is not a
   * general Flow-to-JS conversion, and does not need to be.
   */
  const FLOW_TYPE_STATEMENT = /^\s*(?:import|export)\s+type\s+[^;]*;\s*$/gm;

  return {
    name: 'react-native-jsx',
    enforce: 'pre',
    async transform(code, id) {
      if (!target.test(id)) {
        return null;
      }

      const stripped = code.replace(FLOW_TYPE_STATEMENT, '');
      const result = await transform(stripped, {
        loader: 'jsx',
        jsx: 'automatic',
        target: 'es2020',
        sourcefile: id,
        sourcemap: true,
      });
      return {code: result.code, map: result.map};
    },
  };
}

export default defineConfig({
  root: here,

  resolve: {
    // `.web.tsx` first: that is how a platform override is expressed, and
    // without it a native-only file is picked and the build dies inside it.
    extensions: ['.web.tsx', '.web.ts', '.web.jsx', '.web.js', '.tsx', '.ts', '.jsx', '.js', '.json'],

    alias: [
      // The substitution the whole build rests on. It points at a local
      // re-export rather than straight at react-native-web, because a handful
      // of core names (PermissionsAndroid, for one) are not implemented there
      // and a missing export fails the build rather than the call.
      {find: /^react-native$/, replacement: fromHere('shims/react-native.ts')},

      // Native modules with no browser implementation. Each shim documents
      // what it stands in for and what is lost. Ordered longest-first: Vite
      // matches these in order, so a bare `@react-native-firebase/app` rule
      // would otherwise swallow `/messaging` too.
      {
        find: /^@react-native-firebase\/messaging$/,
        replacement: fromHere('shims/firebase-messaging.ts'),
      },
      {find: /^@react-native-firebase\/app$/, replacement: fromHere('shims/firebase-app.ts')},
      {find: /^react-native-config$/, replacement: fromHere('shims/react-native-config.ts')},
      {find: /^react-native-network-info$/, replacement: fromHere('shims/network-info.ts')},
      {find: /^react-native-sound$/, replacement: fromHere('shims/sound.ts')},
      {find: /^react-native-device-info$/, replacement: fromHere('shims/device-info.ts')},
      {
        find: /^react-native-push-notification$/,
        replacement: fromHere('shims/push-notification.ts'),
      },

      // The app's own path aliases, mirrored from tsconfig.json. Vite does not
      // read tsconfig `paths`, so they have to be repeated here — and they
      // must stay in step with that file.
      {find: /^@components\//, replacement: `${fromRoot('src/components')}/`},
      {find: /^@screens\//, replacement: `${fromRoot('src/screens')}/`},
      {find: /^@services\//, replacement: `${fromRoot('src/services')}/`},
      {find: /^@hooks\//, replacement: `${fromRoot('src/hooks')}/`},
      {find: /^@context\//, replacement: `${fromRoot('src/context')}/`},
      {find: /^@utils\//, replacement: `${fromRoot('src/utils')}/`},
      {find: /^@styles\//, replacement: `${fromRoot('src/styles')}/`},
      {find: /^@\//, replacement: `${fromRoot('src')}/`},
    ],
  },

  define: {
    // React Native's source branches on `__DEV__`, which the Metro bundler
    // provides and Vite does not. Without it the first RN module to read it
    // throws a ReferenceError before anything renders.
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
    global: 'globalThis',
  },

  optimizeDeps: {
    // Only the packages that are genuinely plain ESM get pre-bundled.
    include: ['react', 'react-dom', 'react-native-web'],

    /**
     * Everything in the React Native ecosystem is excluded from pre-bundling.
     *
     * esbuild's dependency scanner crawls a package's whole file tree, and
     * these ship TurboModule spec files written in **Flow** — `import type
     * {TurboModule} from 'react-native/Libraries/...'`. esbuild cannot parse
     * Flow at all (there is no loader for it), so the scan dies on a file the
     * browser would never have loaded: each of these packages also ships a
     * `.web.js` variant, which is what the `resolve.extensions` order above
     * picks once the module actually goes through Vite's own pipeline.
     *
     * Excluding them keeps the scanner out and lets that resolution happen.
     * The cost is a slower cold start in development, which is the right
     * trade against a dev server that does not start.
     */
    exclude: [
      'react-native',
      'react-native-safe-area-context',
      'react-native-screens',
      'react-native-vector-icons',
      'react-native-gesture-handler',
      '@react-navigation/native',
      '@react-navigation/native-stack',
      '@react-navigation/elements',
      '@react-native-async-storage/async-storage',
    ],

    esbuildOptions: {
      // For whatever does get pre-bundled: RN packages publish JSX inside
      // plain .js, which esbuild otherwise parses as JavaScript and rejects.
      loader: {'.js': 'jsx'},
      // Prefer the web variant during scanning too, so the scanner does not
      // walk into a native-only file that the bundle will never include.
      resolveExtensions: ['.web.js', '.web.jsx', '.web.ts', '.web.tsx', '.js', '.jsx', '.ts', '.tsx', '.json'],
      define: {global: 'globalThis'},
    },
  },

  plugins: [react(), reactNativeJsx()],

  server: {
    // 19006 is where an Expo web build serves, and the number people expect.
    // Kept even though this is not Expo, because muscle memory is worth more
    // than consistency with the dashboard's port.
    port: 19006,
    proxy: {
      '/api': {target: 'http://127.0.0.1:8000', changeOrigin: true},
      '/ws': {target: 'ws://127.0.0.1:8000', ws: true},
    },
  },

  build: {
    outDir: fromHere('dist'),
    emptyOutDir: true,
  },
});
