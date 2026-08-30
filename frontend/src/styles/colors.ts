/**
 * Colour palette -- the "Modernist" design system from
 * `frontend/docs/design/`, with the blue accent the BeepMyDevice canvas
 * overrides it with.
 *
 * The design is deliberately monochrome plus **one** accent: every neutral is
 * drawn from one ramp, and the accent carries the primary action, the ONLINE
 * status, the guest badge and error text alike. Introducing a second hue
 * (a green "online", a red "error") breaks the system -- if you need one,
 * change it here, not at a call site.
 *
 * The accent ramp is the canvas's OKLCH ramp (`oklch(L C 255)`) converted to
 * sRGB hex, because React Native has no `oklch()`.
 *
 * No component may hard-code a hex value.
 */

/** Ink-to-paper ramp. `neutral100` is nearly white, `neutral900` nearly black. */
const neutral = {
  neutral100: '#F8F4F4',
  neutral200: '#EAE7E7',
  neutral300: '#D7D3D3',
  neutral400: '#BAB6B6',
  neutral500: '#9B9797',
  neutral600: '#7D7979',
  neutral700: '#605D5D',
  neutral800: '#444141',
  neutral900: '#2D2B2B',
} as const;

/** The single accent ramp. `accent500` is the base accent. */
const accent = {
  accent100: '#D7EAFF',
  accent200: '#B6D7FF',
  accent300: '#87BAFD',
  accent400: '#4693F1',
  accent500: '#006EDC',
  accent600: '#005ABA',
  accent700: '#004A9C',
  accent800: '#003977',
  accent900: '#012854',
} as const;

export const colors = {
  ...neutral,
  ...accent,

  // --- Ground ---------------------------------------------------------------
  background: '#F3F2F2',
  surface: '#EAE9E9',
  /** 40% ink over the background. Used for the 2pt rules that structure a screen. */
  divider: '#9F9D9D',
  /** Scrim behind a modal. */
  scrim: 'rgba(32, 30, 29, 0.5)',

  // --- Text -----------------------------------------------------------------
  textPrimary: '#201E1D',
  textSecondary: neutral.neutral600,
  textTertiary: neutral.neutral700,
  textDisabled: neutral.neutral500,
  textInverse: '#F3F2F2',

  // --- Action ---------------------------------------------------------------
  primary: accent.accent500,
  primaryDark: accent.accent600,
  primaryDarker: accent.accent700,
  primaryLight: accent.accent100,

  // --- Device status --------------------------------------------------------
  // Each status is a foreground/background/border triple so StatusBadge never
  // composes one itself. Colour is always paired with the status word, so the
  // badge stays readable without colour.
  statusOnlineText: accent.accent700,
  statusOnlineBackground: accent.accent100,
  statusOnlineBorder: accent.accent300,

  statusOfflineText: neutral.neutral600,
  statusOfflineBackground: neutral.neutral200,
  statusOfflineBorder: neutral.neutral400,

  // UNKNOWN is not in the canvas -- the design has no third status. It is
  // rendered heavier than OFFLINE (darker ink, solid border) so "left the
  // network" reads as more than "asleep", without adding a hue to the system.
  statusUnknownText: neutral.neutral900,
  statusUnknownBackground: neutral.neutral300,
  statusUnknownBorder: neutral.neutral700,

  // --- Guest ----------------------------------------------------------------
  // Accent-toned, not a warning colour: a guest is a normal participant.
  guestText: accent.accent800,
  guestBackground: accent.accent100,
  guestBorder: accent.accent300,

  // --- Battery --------------------------------------------------------------
  // Two tiers only, matching the canvas: low is called out, everything else is
  // plain ink. A "medium" colour would be information the design drops.
  batteryLow: accent.accent500,
  batteryNormal: '#201E1D',
  batteryTrack: neutral.neutral300,

  // --- Feedback -------------------------------------------------------------
  // Errors are accent-toned, per the system's one-accent rule.
  error: accent.accent500,
  errorText: accent.accent700,
  errorBackground: accent.accent100,
  errorBorder: accent.accent300,
  success: neutral.neutral700,
  successIcon: accent.accent300,
  infoIcon: neutral.neutral400,

  // --- Controls -------------------------------------------------------------
  toggleOn: accent.accent500,
  toggleOff: neutral.neutral400,
  border: neutral.neutral300,
  skeleton: neutral.neutral300,

  transparent: 'transparent',
} as const;

export type ColorName = keyof typeof colors;
