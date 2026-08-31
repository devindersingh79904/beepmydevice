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
 * The canvas is set in Archivo, and the faces are bundled.
 *
 * `assets/fonts/` holds static instances generated from Google's variable
 * Archivo (OFL, see `assets/fonts/OFL.txt`); React Native cannot vary weight
 * from a variable font, so a static face per weight is the only thing that
 * actually renders as designed. They are linked into both native projects by
 * `npx react-native-asset`, driven by `react-native.config.js`.
 *
 * Set this to false to fall back to the platform's system font -- useful when
 * bringing up a new native project before the assets have been linked.
 */
const ARCHIVO_BUNDLED = true;

/**
 * A bundled face carries its own weight, so `fontWeight` is deliberately not
 * set alongside it: asking for weight 700 on top of Archivo-Bold makes the
 * platform synthesise a second layer of boldness over an already-bold face.
 * The system-font fallback has no such face, so there it is the weight that
 * does the work.
 */
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

const heading = (
  ARCHIVO_BUNDLED ? {fontFamily: 'Archivo-Bold'} : {fontWeight: fontWeight.bold}
) as TextStyle;

const body = (
  ARCHIVO_BUNDLED
    ? {fontFamily: 'Archivo-Regular'}
    : {fontWeight: fontWeight.regular}
) as TextStyle;

const semibold = (
  ARCHIVO_BUNDLED
    ? {fontFamily: 'Archivo-SemiBold'}
    : {fontWeight: fontWeight.semibold}
) as TextStyle;

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
    ...semibold,
    fontSize: fontSize.body,
  },
  captionStrong: {
    ...semibold,
    fontSize: fontSize.caption,
  },
  smallStrong: {
    ...semibold,
    fontSize: fontSize.small,
  },
  /** Button label. */
  button: {...heading, fontSize: fontSize.body},
} as const satisfies Record<string, TextStyle>;
