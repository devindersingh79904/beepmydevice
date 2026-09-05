/**
 * React Native entry point.
 *
 * Registers the root component. All application code lives under src/ and is
 * TypeScript; this file stays JavaScript because the native runtime resolves
 * it before the TypeScript transform is available.
 */
// Must be the first import: it installs global.crypto.getRandomValues, which
// Hermes does not provide. `uuid` calls it the moment logger.ts asks for a
// correlation ID -- inside the axios request interceptor -- so without this
// every request throws before it reaches the network and the app reports
// "Could not reach the server" for a server that is perfectly reachable.
import 'react-native-get-random-values';

import {AppRegistry} from 'react-native';

import App from './src/App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);
