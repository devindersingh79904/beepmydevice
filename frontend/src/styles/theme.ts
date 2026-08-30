/**
 * The single theme object every component styles against.
 *
 * Import `theme` rather than the individual scales, so a component only ever
 * has one styling entry point.
 */

import {colors} from './colors';
import {fontSize, fontWeight, radius, spacing} from './spacing';

export const theme = {
  colors,
  spacing,
  radius,
  fontSize,
  fontWeight,
} as const;

export type Theme = typeof theme;

export {colors, spacing, radius, fontSize, fontWeight};
