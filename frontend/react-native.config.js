/**
 * React Native CLI configuration.
 *
 * `assets` is what `npx react-native-asset` reads to copy fonts into both
 * native projects and register them. The Archivo faces and the alert sound
 * live in assets/ and are linked from there rather than being duplicated by
 * hand into ios/ and android/.
 */
module.exports = {
  project: {
    ios: {},
    android: {},
  },
  assets: ['./assets/fonts', './assets/sounds'],
};
