/**
 * Module declarations for the binary assets Metro bundles.
 *
 * Without these, importing an image is a TypeScript error and the only way to
 * load one is `require()`, which the lint rules reject. Declaring them lets
 * assets be imported like anything else.
 *
 * `ImageSourcePropType` rather than `any`: the value is what an <Image source>
 * takes, and saying so keeps a wrong asset from being passed somewhere else.
 */

declare module '*.png' {
  import type {ImageSourcePropType} from 'react-native';

  const source: ImageSourcePropType;
  export default source;
}

declare module '*.jpg' {
  import type {ImageSourcePropType} from 'react-native';

  const source: ImageSourcePropType;
  export default source;
}

declare module '*.wav' {
  const source: number;
  export default source;
}
