/**
 * Icons.
 *
 * Lucide, drawn as inline SVG on `currentColor` — the design system names
 * Lucide specifically, and the canvas inlines the same path data rather than
 * loading an icon font.
 *
 * Inline rather than a package for two reasons. It is the only way the stroke
 * inherits the text colour of whatever it sits in, which is what makes an icon
 * inside `.btn-primary` turn light without a rule for it. And an icon font —
 * which is what the mobile app has to use — renders every glyph as a blank box
 * if the file fails to load, with nothing in the console to say so.
 *
 * Paths are copied verbatim from the canvas. To add one, take it from
 * lucide.dev; do not redraw it.
 */

import type {ReactElement} from 'react';

import {ICON_SIZE} from '@/utils/constants';

/** The icons this dashboard uses, by Lucide's own name. */
export type IconName =
  | 'home'
  | 'smartphone'
  | 'activity'
  | 'bell'
  | 'sliders'
  | 'wifi'
  | 'log-out'
  | 'trash'
  | 'refresh'
  | 'check'
  | 'x'
  | 'search'
  | 'user'
  | 'lock'
  | 'info'
  | 'eye'
  | 'eye-off'
  | 'chevron-right';

/**
 * Path data per icon, as a list of subpaths.
 *
 * A list rather than one string because several of these are genuinely
 * multi-stroke, and joining them with spaces silently merges the fill rule.
 */
const PATHS: Record<IconName, string[]> = {
  home: ['M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'],
  smartphone: ['M7 2h10v20H7z', 'M11 18h2'],
  activity: ['M22 12h-4l-3 9L9 3l-3 9H2'],
  bell: ['M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9', 'M13.73 21a2 2 0 0 1-3.46 0'],
  sliders: [
    'M4 21v-7',
    'M4 10V3',
    'M12 21v-9',
    'M12 8V3',
    'M20 21v-5',
    'M20 12V3',
    'M1 14h6',
    'M9 8h6',
    'M17 16h6',
  ],
  wifi: ['M5 12.86a10 10 0 0 1 14 0', 'M8.5 16.43a5 5 0 0 1 7 0', 'M12 20h.01'],
  'log-out': ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'M16 17l5-5-5-5', 'M21 12H9'],
  trash: ['M3 6h18', 'M8 6V4h8v2', 'M19 6l-1 14H6L5 6', 'M10 11v6', 'M14 11v6'],
  refresh: ['M23 4v6h-6', 'M1 20v-6h6', 'M3.51 9a9 9 0 0 1 14.85-3.36L23 10', 'M1 14l4.64 4.36A9 9 0 0 0 20.49 15'],
  check: ['M20 6L9 17l-5-5'],
  x: ['M18 6L6 18', 'M6 6l12 12'],
  search: ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z', 'M21 21l-4.35-4.35'],
  user: ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'],
  lock: ['M5 11h14v10H5z', 'M8 11V7a4 4 0 0 1 8 0v4'],
  info: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M12 16v-4', 'M12 8h.01'],
  eye: ['M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
  'eye-off': [
    'M9.9 4.24A9.1 9.1 0 0 1 12 4c6.4 0 10 8 10 8a17.6 17.6 0 0 1-2.16 3.19',
    'M6.61 6.61A17.8 17.8 0 0 0 2 12s3.6 8 10 8a9 9 0 0 0 5.39-1.61',
    'M14.12 14.12a3 3 0 1 1-4.24-4.24',
    'M2 2l20 20',
  ],
  'chevron-right': ['M9 18l6-6-6-6'],
};

interface IconProps {
  name: IconName;
  /** Pixel size. 16 in dense rows, 18 in nav, 20 in stat tiles. */
  size?: number;
  /** Accessible label. Omit for an icon that only decorates labelled text. */
  title?: string;
}

export function Icon({name, size = ICON_SIZE.large, title}: IconProps): ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="square"
      strokeLinejoin="miter"
      /* Square caps and mitred joins, not Lucide's default rounded ones: this
         system does not round a corner anywhere, and a rounded stroke cap is
         the same decision at 2px. */
      role={title === undefined ? 'presentation' : 'img'}
      aria-hidden={title === undefined}
      aria-label={title}
    >
      {title !== undefined && <title>{title}</title>}
      {PATHS[name].map(d => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

/** Default edge of the brand mark, in pixels. */
const BRAND_MARK_SIZE = 24;

/**
 * The BeepMyDevice mark.
 *
 * A device slab with two signal arcs, taken from the canvas. The slab is ink
 * and the arcs are the accent, which is the whole system in one glyph.
 */
export function BrandMark({size = BRAND_MARK_SIZE}: {size?: number}): ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role="presentation" aria-hidden>
      <rect x="22" y="30" width="40" height="64" fill="currentColor" />
      <rect x="30" y="40" width="24" height="36" fill="var(--color-bg)" />
      <path
        d="M72 46 A18 18 0 0 1 72 78"
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth={9}
      />
      <path
        d="M84 34 A34 34 0 0 1 84 90"
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth={9}
        opacity={0.45}
      />
    </svg>
  );
}
