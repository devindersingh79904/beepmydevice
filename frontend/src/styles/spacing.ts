/**
 * Spacing, radius and component sizes taken from the design canvas in
 * `frontend/docs/design/`.
 *
 * `no-magic-numbers` is an ESLint error, so every pixel value a component uses
 * is named here. Scales are named after their value (`s12` is 12pt) because
 * the canvas is not on a strict 4pt grid -- it uses 2, 6, 10, 14 and 18 as
 * well -- and a t-shirt scale would have to lie about which value it maps to.
 */

export const spacing = {
  s2: 2,
  s4: 4,
  s6: 6,
  s8: 8,
  s10: 10,
  s12: 12,
  s14: 14,
  s16: 16,
  s18: 18,
  s20: 20,
  s24: 24,
  s28: 28,
  s32: 32,
  s48: 48,
} as const;

/**
 * Corner radii.
 *
 * All zero. Modernist is a square-cornered system -- the flat corner is the
 * look, not an oversight. Rounding one control makes it look foreign.
 */
export const radius = {
  none: 0,
} as const;

/** Border weights. 2pt separates *sections*; 1pt separates *rows* within one. */
export const borderWidth = {
  hairline: 1,
  rule: 2,
  accentBar: 4,
} as const;

/** Fixed component dimensions from the canvas. */
export const sizes = {
  /** Header bar on dashboard, detail, settings. */
  headerHeight: 56,

  splashLogo: 96,
  splashLogoIcon: 52,
  authLogo: 56,
  authLogoIcon: 30,

  avatar: 40,
  avatarLarge: 44,

  /**
   * Text input height.
   *
   * The canvas draws inputs at 36pt. Raised to 44 here because 44pt is the
   * minimum touch target on iOS and Android, and the canvas is a pointer-driven
   * mock. This is the one dimension deliberately not copied.
   */
  inputHeight: 44,
  buttonPrimary: 48,
  buttonDialog: 44,
  buttonCard: 40,

  iconXs: 16,
  iconSm: 18,
  iconMd: 20,
  iconLg: 28,
  iconXl: 36,
  iconEmpty: 48,

  /** Square tile holding the device glyph on the detail screen. */
  deviceTile: 72,

  settingsRow: 52,
  settingsRowTall: 56,

  /** The agree-to-policy box on the register screen. Square, like everything. */
  checkbox: 20,

  toggleWidth: 44,
  toggleHeight: 24,
  toggleKnob: 18,
  toggleKnobInset: 3,
  toggleKnobTravel: 23,

  batteryBar: 8,
  dialogMaxWidth: 340,
  /** Distance from the top of the screen to the error banner. */
  bannerTop: 110,
  toastBottom: 44,

  skeletonTitle: 16,
  skeletonMeta: 12,
  skeletonButton: 40,
  spinner: 22,
} as const;

/** Fractions expressed as percentage strings, for widths the canvas sets in %. */
export const ratios = {
  dialogWidth: '82%',
  skeletonTitleWidth: '55%',
  skeletonMetaWidth: '35%',
  full: '100%',
} as const;
