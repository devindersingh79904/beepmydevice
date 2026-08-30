/** Colour palette. No component may hard-code a hex value. */

export const colors = {
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primaryLight: '#DBEAFE',

  // Device status. Green/amber/red is reinforced with text and an icon in the
  // UI, so status is never conveyed by colour alone.
  online: '#16A34A',
  offline: '#DC2626',
  unknown: '#CA8A04',

  // Guest devices. Deliberately neutral, not a warning colour -- a guest is a
  // normal participant, not a problem to be flagged.
  guest: '#64748B',
  guestBackground: '#F1F5F9',

  batteryHigh: '#16A34A',
  batteryMedium: '#CA8A04',
  batteryLow: '#DC2626',

  error: '#DC2626',
  errorBackground: '#FEE2E2',
  success: '#16A34A',
  successBackground: '#DCFCE7',
  warning: '#CA8A04',

  background: '#FFFFFF',
  surface: '#F8FAFC',
  border: '#E2E8F0',

  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textDisabled: '#94A3B8',
  textInverse: '#FFFFFF',

  transparent: 'transparent',
} as const;

export type ColorName = keyof typeof colors;
