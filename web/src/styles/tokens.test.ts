/**
 * The design system must not fork.
 *
 * The web dashboard holds its palette as CSS custom properties and the mobile
 * app holds the same palette as a TypeScript object, because React Native has
 * no `oklch()` and no stylesheet to read variables from. Two copies of one
 * palette drift — someone darkens the accent for a contrast fix on one side
 * and the two products stop matching, quietly, in a way no reviewer catches.
 *
 * This test reads the mobile palette off disk and asserts every shared value
 * is identical in `tokens.css`. It fails the build rather than a review.
 */

import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {describe, expect, it} from 'vitest';

// Resolved from the package root rather than from `import.meta.url`: under the
// jsdom environment that URL is an http:// one, and `fileURLToPath` rejects it.
// Vitest runs with the cwd set to this package.
const root = process.cwd();

const tokensCss = readFileSync(resolve(root, 'src/styles/tokens.css'), 'utf8');

const mobileColors = readFileSync(
  resolve(root, '../frontend/src/styles/colors.ts'),
  'utf8',
);

/** Every `--name: #value;` in the token sheet, lowercased. */
function cssVariables(source: string): Map<string, string> {
  const found = new Map<string, string>();
  const pattern = /--([a-z0-9-]+):\s*(#[0-9a-f]{3,8})\s*;/gi;
  let match = pattern.exec(source);
  while (match !== null) {
    found.set(match[1] as string, (match[2] as string).toLowerCase());
    match = pattern.exec(source);
  }
  return found;
}

/** Every `name: '#value',` in the mobile palette, lowercased. */
function tsColors(source: string): Map<string, string> {
  const found = new Map<string, string>();
  const pattern = /([A-Za-z0-9]+):\s*'(#[0-9a-fA-F]{3,8})'/g;
  let match = pattern.exec(source);
  while (match !== null) {
    found.set(match[1] as string, (match[2] as string).toLowerCase());
    match = pattern.exec(source);
  }
  return found;
}

const css = cssVariables(tokensCss);
const mobile = tsColors(mobileColors);

/**
 * CSS variable to mobile palette key.
 *
 * Only the values that genuinely have to agree. `--color-surface` and the
 * ramps are the system; a web-only token like `--sidebar-width` has no mobile
 * counterpart and is not listed.
 */
const SHARED: Record<string, string> = {
  'color-bg': 'background',
  'color-surface': 'surface',
  'color-text': 'textPrimary',
  'color-divider': 'divider',
  // Not mapped to `primary`: the mobile palette declares that as a reference
  // (`primary: accent.accent500`) rather than a literal, so there is no hex to
  // compare. The alias itself is asserted separately below.
  'color-accent': 'accent500',
  'color-accent-100': 'accent100',
  'color-accent-200': 'accent200',
  'color-accent-300': 'accent300',
  'color-accent-400': 'accent400',
  'color-accent-500': 'accent500',
  'color-accent-600': 'accent600',
  'color-accent-700': 'accent700',
  'color-accent-800': 'accent800',
  'color-accent-900': 'accent900',
  'color-neutral-100': 'neutral100',
  'color-neutral-200': 'neutral200',
  'color-neutral-300': 'neutral300',
  'color-neutral-400': 'neutral400',
  'color-neutral-500': 'neutral500',
  'color-neutral-600': 'neutral600',
  'color-neutral-700': 'neutral700',
  'color-neutral-800': 'neutral800',
  'color-neutral-900': 'neutral900',
};

describe('design tokens', () => {
  it('parses both palettes', () => {
    expect(css.size).toBeGreaterThan(20);
    expect(mobile.size).toBeGreaterThan(20);
  });

  it.each(Object.entries(SHARED))(
    '--%s matches the mobile palette',
    (variable, mobileKey) => {
      const webValue = css.get(variable);
      const mobileValue = mobile.get(mobileKey);

      expect(webValue, `--${variable} is missing from tokens.css`).toBeDefined();
      expect(
        mobileValue,
        `${mobileKey} is missing from frontend/src/styles/colors.ts`,
      ).toBeDefined();
      expect(webValue).toBe(mobileValue);
    },
  );

  it('keeps the mobile palette aliasing primary to the base accent', () => {
    // The comparison above checks the ramp; this checks that the mobile app's
    // primary action colour is still the same step of it. Someone repointing
    // `primary` at accent600 would otherwise pass every other assertion here.
    expect(mobileColors).toMatch(/primary:\s*accent\.accent500/);
  });

  it('rounds no corner', () => {
    // The system's one hard rule. A non-zero radius here would let a component
    // round itself without anyone reviewing the decision.
    const radii = tokensCss.match(/--radius-[a-z]+:\s*([^;]+);/g) ?? [];
    expect(radii.length).toBeGreaterThan(0);
    for (const radius of radii) {
      expect(radius).toContain('0px');
    }
  });
});
