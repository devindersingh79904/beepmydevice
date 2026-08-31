module.exports = {
  presets: ['@react-native/babel-preset'],
  plugins: [
    // Mirrors the path aliases in tsconfig.json. Both must be kept in sync:
    // TypeScript resolves them at type-check time, Babel at bundle time.
    //
    // There is deliberately no '@types' alias: TypeScript reserves that
    // specifier for DefinitelyTyped packages and rejects any import through it
    // with TS6137. Domain types are imported as '@/types/...' instead.
    [
      'module-resolver',
      {
        root: ['./src'],
        alias: {
          '@': './src',
          '@components': './src/components',
          '@screens': './src/screens',
          '@services': './src/services',
          '@hooks': './src/hooks',
          '@context': './src/context',
          '@utils': './src/utils',
          '@styles': './src/styles',
        },
      },
    ],
  ],
};
