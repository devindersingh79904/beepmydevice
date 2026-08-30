/**
 * React Native entry point.
 *
 * Registers the root component. All application code lives under src/ and is
 * TypeScript; this file stays JavaScript because the native runtime resolves
 * it before the TypeScript transform is available.
 */
import {AppRegistry} from 'react-native';

import App from './src/App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);
