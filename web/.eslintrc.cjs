/**
 * Lint rules for the dashboard.
 *
 * The same contract the mobile app is held to: no `any`, explicit return types,
 * no magic numbers, and no console calls outside the logger. These are errors
 * rather than warnings — a warning in a build that nobody reads is a rule that
 * does not exist.
 */

module.exports = {
  root: true,
  env: {browser: true, es2022: true},
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {jsx: true},
  },
  plugins: ['@typescript-eslint', 'react-hooks'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  settings: {react: {version: '18.2'}},
  ignorePatterns: ['dist', 'node_modules', '*.cjs'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': [
      'error',
      {allowExpressions: true, allowTypedFunctionExpressions: true},
    ],
    '@typescript-eslint/consistent-type-imports': [
      'error',
      {prefer: 'type-imports', fixStyle: 'separate-type-imports'},
    ],
    '@typescript-eslint/no-unused-vars': ['error', {argsIgnorePattern: '^_'}],

    // The logger is the console boundary; it disables this rule for itself.
    'no-console': 'error',

    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'error',

    eqeqeq: ['error', 'always', {null: 'ignore'}],
    'no-magic-numbers': [
      'error',
      {
        // 0/1/2 are structural (indices, lengths, the `* 2` in the reconnect
        // backoff); 100 is a percentage. Everything else belongs in
        // utils/constants.ts with a name and a reason.
        ignore: [-1, 0, 1, 2, 100],
        ignoreArrayIndexes: true,
        enforceConst: true,
        detectObjects: false,
      },
    ],
  },
  overrides: [
    {
      // Tests are allowed literal values: a fixture that says `battery: 85` is
      // clearer than one that says `battery: SAMPLE_BATTERY`.
      files: ['**/*.test.ts', '**/*.test.tsx', 'src/test/**'],
      rules: {'no-magic-numbers': 'off'},
    },
  ],
};
