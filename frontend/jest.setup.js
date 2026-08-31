/**
 * Jest environment setup.
 *
 * Every native module the app touches is mocked here rather than in individual
 * tests: they are all unavailable under Node, and a test that forgets one fails
 * with an unrelated "cannot read property of undefined" deep inside a library.
 */

/* eslint-env jest */

jest.mock('react-native-config', () => ({
  __esModule: true,
  default: {
    API_BASE_URL: 'http://localhost:8000',
    WS_BASE_URL: 'ws://localhost:8000',
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => {
  // A real in-memory store, not jest.fn() stubs: the storage wrapper is worth
  // exercising for real, and round-tripping JSON is most of what it does.
  let store = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async key => (key in store ? store[key] : null)),
      setItem: jest.fn(async (key, value) => {
        store[key] = value;
      }),
      removeItem: jest.fn(async key => {
        delete store[key];
      }),
      multiRemove: jest.fn(async keys => {
        keys.forEach(key => delete store[key]);
      }),
      clear: jest.fn(async () => {
        store = {};
      }),
    },
  };
});

jest.mock('react-native-device-info', () => ({
  __esModule: true,
  default: {
    getDeviceName: jest.fn(async () => 'Test Device'),
    getSystemVersion: jest.fn(() => '17.0'),
    getBatteryLevel: jest.fn(async () => 0.85),
  },
}));

jest.mock('react-native-network-info', () => ({
  NetworkInfo: {
    getBSSID: jest.fn(async () => '00:1a:2b:3c:4d:5e'),
    getSSID: jest.fn(async () => 'Home-WiFi'),
  },
}));

jest.mock('@react-native-firebase/messaging', () => {
  // One shared instance, so a test can steer it with
  // messaging().requestPermission.mockResolvedValue(...) instead of having to
  // re-mock the module.
  const instance = {
    requestPermission: jest.fn(async () => 1),
    getToken: jest.fn(async () => 'push-token'),
    onMessage: jest.fn(() => jest.fn()),
    onTokenRefresh: jest.fn(() => jest.fn()),
    setBackgroundMessageHandler: jest.fn(),
  };
  const messaging = () => instance;
  messaging.AuthorizationStatus = {AUTHORIZED: 1, PROVISIONAL: 2, DENIED: 0};
  return {__esModule: true, default: messaging};
});

jest.mock('react-native-sound', () => {
  const Sound = jest.fn(function MockSound(_file, _bundle, callback) {
    this.setVolume = jest.fn();
    this.play = jest.fn();
    this.release = jest.fn();
    if (callback) {
      callback(null);
    }
  });
  Sound.setCategory = jest.fn();
  Sound.MAIN_BUNDLE = 'main';
  return {__esModule: true, default: Sound};
});

jest.mock('react-native-vector-icons/Feather', () => 'Feather');
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'MCIcons');
