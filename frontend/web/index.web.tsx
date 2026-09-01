/**
 * Web entry point.
 *
 * The native entry (`index.js`) registers the root component with
 * `AppRegistry` and stops there — the platform runtime mounts it. On web
 * nothing does, so this file registers *and* runs the application.
 *
 * The app name is read from `app.json`, the same source `index.js` uses, so
 * the two entry points cannot disagree about it.
 */

import {AppRegistry} from 'react-native';

import {name as appName} from '../app.json';
import App from '../src/App';

const rootTag = document.getElementById('root');
if (rootTag === null) {
  throw new Error('index.html is missing its #root element');
}

AppRegistry.registerComponent(appName, () => App);
AppRegistry.runApplication(appName, {rootTag});
