/**
 * Registers the jest-native matchers (`toBeDisabled`, `toBeOnTheScreen`, …)
 * with TypeScript.
 *
 * `setupFilesAfterEnv` loads them at runtime, but tsc needs the declarations
 * imported somewhere inside the compilation to widen `expect`.
 */

import '@testing-library/react-native/extend-expect';
