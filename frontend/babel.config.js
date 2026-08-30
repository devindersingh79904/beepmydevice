module.exports = {
  presets: ['@react-native/babel-preset'],
  plugins: [
    // Mirrors the path aliases in tsconfig.json. Both must be kept in sync:
    // TypeScript resolves them at type-check time, Babel at bundle time.
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
          '@types': './src/types',
          '@styles': './src/styles',
        },
      },
    ],
  ],
};
