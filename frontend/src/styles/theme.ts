/**
 * The single theme object every component styles against.
 *
 * Import `theme` rather than the individual scales, so a component only ever
 * has one styling entry point. The values come from the design canvas in
 * `frontend/docs/design/` -- see `colors.ts` for the system's one rule
 * (monochrome plus a single accent) before adding anything here.
 */

import {colors} from './colors';
import {borderWidth, radius, ratios, sizes, spacing} from './spacing';
import {fontSize, fontWeight, typography} from './typography';

const SHADOW_OFFSET_Y = 12;
const SHADOW_RADIUS = 16;
const SHADOW_OPACITY = 0.22;
const SHADOW_ELEVATION = 12;

/** Modernist uses one elevation, on dialogs. Everything else sits flat. */
export const elevation = {
  dialog: {
    shadowColor: colors.neutral900,
    shadowOffset: {width: 0, height: SHADOW_OFFSET_Y},
    shadowOpacity: SHADOW_OPACITY,
    shadowRadius: SHADOW_RADIUS,
    elevation: SHADOW_ELEVATION,
  },
} as const;

export const theme = {
  colors,
  spacing,
  radius,
  borderWidth,
  sizes,
  ratios,
  typography,
  fontSize,
  fontWeight,
  elevation,
} as const;

export type Theme = typeof theme;

export {
  colors,
  spacing,
  radius,
  borderWidth,
  sizes,
  ratios,
  typography,
  fontSize,
  fontWeight,
};
