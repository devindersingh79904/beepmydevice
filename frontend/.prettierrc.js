/**
 * Prettier configuration.
 *
 * These are the React Native template's settings, and they are what the whole
 * codebase is already written in. Without this file Prettier 3 falls back to
 * its own defaults (double quotes, bracket spacing) and `npm run lint` reports
 * an error on nearly every line via `prettier/prettier`.
 */
module.exports = {
  arrowParens: 'avoid',
  bracketSameLine: true,
  bracketSpacing: false,
  singleQuote: true,
  trailingComma: 'all',
};
