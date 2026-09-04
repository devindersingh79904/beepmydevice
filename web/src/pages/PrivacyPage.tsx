/**
 * The privacy policy as a page of its own.
 *
 * Public, and it has to be: an app-store listing links to it from outside the
 * product, the register form asks people to agree to it before they have an
 * account, and someone deciding whether to sign up has to be able to read it
 * first. Signed in it renders inside the dashboard chrome; signed out, inside
 * `LegalShell`.
 *
 * The document lives in `components/PolicyDocument` because Settings renders
 * the same sections in its Privacy tab, which the canvas draws as a card. Only
 * the framing differs — this page adds a lead paragraph and jump links, which
 * a 760px card has no room for.
 */

import type {ReactElement} from 'react';

import {
  PolicyContents,
  PolicyDates,
  PolicySections,
} from '@/components/PolicyDocument';

export function PrivacyPage(): ReactElement {
  return (
    <article className="legal">
      <header className="legal-head">
        <p className="card-kicker">Legal</p>
        <h1>Privacy policy</h1>
        <p className="legal-lead">
          BeepMyDevice rings the devices on one home network, whoever they are
          signed in to. This document says what that needs to know about you,
          what it does with it, and what it will not do.
        </p>
        <PolicyDates />
      </header>

      <PolicyContents />
      <PolicySections />
    </article>
  );
}
