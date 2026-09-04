/**
 * What is worth testing about a page of prose.
 *
 * Not the wording — a test that asserts a sentence fails on every edit and
 * teaches nobody anything. What is asserted here is the structure the document
 * is relied on for: that every entry in the contents leads somewhere, that the
 * dates are real dates and not a placeholder that shipped, and that the
 * addresses a reader is told to write to are the ones in `LEGAL`.
 *
 * The placeholder check is the one that earns its place. A privacy policy is
 * copied from a template with `[Today's Date]` and `[Your Address]` in it, and
 * a bracketed placeholder reaching an app-store submission is a rejection.
 */

import {render, screen, within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {describe, expect, it} from 'vitest';

import {PrivacyPage} from '@/pages/PrivacyPage';
import {LEGAL} from '@/utils/constants';

function renderPage(): HTMLElement {
  const {container} = render(
    <MemoryRouter>
      <PrivacyPage />
    </MemoryRouter>,
  );
  return container;
}

describe('PrivacyPage', () => {
  it('titles itself', () => {
    renderPage();
    expect(screen.getByRole('heading', {level: 1})).toHaveTextContent('Privacy policy');
  });

  it('points every contents entry at a section that exists', () => {
    const container = renderPage();
    const toc = screen.getByRole('navigation', {name: /sections of this policy/i});
    const links = within(toc).getAllByRole('link');

    expect(links.length).toBeGreaterThan(0);

    for (const link of links) {
      const href = link.getAttribute('href') ?? '';
      expect(href).toMatch(/^#/);

      const target = container.querySelector(href);
      expect(target, `no section for ${href}`).not.toBeNull();
      // The heading a reader lands on must be the one the contents promised.
      expect(target).toHaveTextContent(link.textContent ?? '');
    }
  });

  it('numbers the headings in contents order', () => {
    const container = renderPage();
    const numbers = [...container.querySelectorAll('.legal-number')].map(
      node => node.textContent,
    );
    const toc = screen.getByRole('navigation', {name: /sections of this policy/i});

    expect(numbers).toEqual(
      within(toc)
        .getAllByRole('link')
        .map((_, index) => String(index + 1)),
    );
  });

  it('renders the dates from LEGAL, spelled out and machine-readable', () => {
    const container = renderPage();
    const times = [...container.querySelectorAll('time')];

    expect(times.map(node => node.getAttribute('datetime'))).toEqual([
      LEGAL.LAST_UPDATED,
      LEGAL.EFFECTIVE_FROM,
    ]);
    // Spelled out, so no reader has to guess whether 04/09 is April or
    // September.
    expect(times[0]).toHaveTextContent(/^\d{1,2} [A-Z][a-z]+ \d{4}$/);
  });

  it('carries no template placeholder', () => {
    const container = renderPage();
    // `[Today's Date]`, `[Your Address]`, `[Company]` -- anything still in
    // brackets is something nobody filled in.
    expect(container.textContent).not.toMatch(/\[[^\]]+\]/);
    expect(container.textContent).not.toMatch(/TODO|TBD|lorem ipsum/i);
  });

  it('gives the reader the contact addresses from LEGAL', () => {
    renderPage();
    const mailto = screen.getAllByRole('link', {name: LEGAL.PRIVACY_EMAIL});

    expect(mailto.length).toBeGreaterThan(0);
    for (const link of mailto) {
      expect(link).toHaveAttribute('href', `mailto:${LEGAL.PRIVACY_EMAIL}`);
    }
    expect(screen.getByRole('link', {name: LEGAL.WEBSITE})).toHaveAttribute(
      'href',
      LEGAL.WEBSITE,
    );
  });

  it('sends the third-party policies out of the tab, safely', () => {
    renderPage();
    for (const url of [LEGAL.GOOGLE_PRIVACY_URL, LEGAL.APPLE_PRIVACY_URL]) {
      const link = screen.getByRole('link', {name: url});
      expect(link).toHaveAttribute('href', url);
      expect(link).toHaveAttribute('target', '_blank');
      // Without this the opened page gets a handle on ours via window.opener.
      expect(link).toHaveAttribute('rel', 'noreferrer');
    }
  });
});
