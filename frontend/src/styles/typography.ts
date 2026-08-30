/**
 * Type scale from the design canvas in `frontend/docs/design/`.
 *
 * Exports ready-made `TextStyle` objects rather than loose numbers, so a
 * component never composes a size, a weight and a family itself -- it spreads
 * one named style. That is what keeps eleven screens looking like one app.
 *
 * Spread them inside `StyleSheet.create`:
 *
 *     title: {...typography.screenTitle, color: colors.textPrimary},
 */

import type {TextStyle} from 'react-native';

/**
 * The canvas is set in Archivo.
 *
 * The font files are not bundled yet (`frontend/assets/fonts/` is empty). Until
 * they are, both families resolve to the platform's system font, which is the
 * closest available grotesque. To switch the whole app over: drop
 * `Archivo-Regular/SemiBold/Bold.ttf` into `assets/fonts/`, run
 * `npx react-native-asset`, and flip this one flag.
 */
const ARCHIVO_BUNDLED = false;

const headingFamily = ARCHIVO_BUNDLED ? 'Archivo-Bold' : undefined;
const bodyFamily = ARCHIVO_BUNDLED ? 'Archivo-Regular' : undefined;

export const fontWeight = {
  regular: '400',
  semibold: '600',
  bold: '700',
} as const satisfies Record<string, TextStyle['fontWeight']>;

/** Raw sizes. Prefer the composed styles below; these are for one-off tuning. */
export const fontSize = {
  badge: 11,
  caption: 12,
  small: 13,
  body: 14,
  bodyLarge: 15,
  cardTitle: 16,
  sectionTitle: 17,
  screenTitle: 18,
  dialogTitle: 20,
  authTitle: 28,
  displayTitle: 34,
} as const;

const heading = {
  fontFamily: headingFamily,
  fontWeight: fontWeight.bold,
} as const;

const body = {
  fontFamily: bodyFamily,
  fontWeight: fontWeight.regular,
} as const;

const TIGHT_TRACKING = -0.5;
const BADGE_TRACKING = 0.5;
const LABEL_TRACKING = 1;
const BODY_LINE_HEIGHT = 20;
const LARGE_LINE_HEIGHT = 22;

export const typography = {
  /** Splash wordmark. */
  displayTitle: {
    ...heading,
    fontSize: fontSize.displayTitle,
    letterSpacing: TIGHT_TRACKING,
  },
  /** "Welcome back", "Create account". */
  authTitle: {
    ...heading,
    fontSize: fontSize.authTitle,
    letterSpacing: TIGHT_TRACKING,
  },
  /** Modal headings and the device name on the detail screen. */
  dialogTitle: {...heading, fontSize: fontSize.dialogTitle},
  /** Header-bar title. */
  screenTitle: {...heading, fontSize: fontSize.screenTitle},
  /** "Alert history" and peers. */
  sectionTitle: {...heading, fontSize: fontSize.sectionTitle},
  /** Device name on a dashboard card. */
  cardTitle: {...heading, fontSize: fontSize.cardTitle},
  /** Name in a list row or dialog summary -- one step below a card title. */
  listTitle: {...heading, fontSize: fontSize.bodyLarge},

  /** All-caps rule label: STATUS, BATTERY, ACCOUNT. */
  sectionLabel: {
    ...heading,
    fontSize: fontSize.caption,
    letterSpacing: LABEL_TRACKING,
  },
  /** Badge text: ONLINE, GUEST. */
  badge: {
    ...heading,
    fontSize: fontSize.badge,
    letterSpacing: BADGE_TRACKING,
  },

  bodyLarge: {
    ...body,
    fontSize: fontSize.bodyLarge,
    lineHeight: LARGE_LINE_HEIGHT,
  },
  body: {...body, fontSize: fontSize.body, lineHeight: BODY_LINE_HEIGHT},
  small: {...body, fontSize: fontSize.small},
  caption: {...body, fontSize: fontSize.caption},
  /** Smallest readable text -- the header's device count. */
  micro: {...body, fontSize: fontSize.badge},

  /** Emphasised body -- validation messages, toggle labels. */
  bodyStrong: {
    ...body,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  captionStrong: {
    ...body,
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
  },
  smallStrong: {
    ...body,
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
  },
  /** Button label. */
  button: {...heading, fontSize: fontSize.body},
} as const satisfies Record<string, TextStyle>;
