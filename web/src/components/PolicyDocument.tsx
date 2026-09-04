/**
 * The privacy policy's content, independent of where it is framed.
 *
 * It is rendered in two places that look nothing alike — the standalone
 * `/privacy` page, and the Privacy tab inside Settings, which the canvas draws
 * as a card with the date on the heading row. Two copies of a legal document
 * is how a product ends up promising two different things, so the sections
 * live here once and each frame supplies its own heading.
 *
 * There is no content model behind the prose. A policy is edited by a person
 * about twice a year, and a JSON tree of headings and bullet arrays makes that
 * edit harder than an ordinary paragraph does. What is factored out are the
 * values that appear more than once or change independently of the wording —
 * dates, addresses, the push providers' own policies — which live in `LEGAL`.
 *
 * Two things this file does NOT do, on purpose:
 *
 * - It states no postal address. `LEGAL` has no `ADDRESS` field to render, and
 *   inventing one for a legal document is worse than leaving the contact
 *   section reachable by email and website alone.
 * - It claims no behaviour the product does not have. Where the design canvas
 *   states something this system does not do, the corrected sentence is here
 *   and the deviation is marked inline. The mobile app renders the same
 *   document from `frontend/src/screens/AppStack/PrivacyPolicyScreen.tsx`;
 *   the two must agree.
 */

import type {ReactElement, ReactNode} from 'react';

import {LEGAL} from '@/utils/constants';
import {longDate} from '@/utils/format';

interface SectionSpec {
  id: string;
  title: string;
}

/**
 * The contents list and the section headings come from one array.
 *
 * A table of contents maintained beside the sections it points at drifts, and
 * a dead anchor in a legal document is the kind of thing nobody notices for a
 * year. Numbering is positional for the same reason — inserting a section
 * renumbers the rest without an edit.
 */
export const POLICY_SECTIONS: SectionSpec[] = [
  {id: 'introduction', title: 'Introduction'},
  {id: 'information-we-collect', title: 'Information we collect'},
  {id: 'how-we-use-it', title: 'How we use your information'},
  {id: 'storage-and-security', title: 'Data storage and security'},
  {id: 'retention', title: 'Data retention'},
  {id: 'third-parties', title: 'Third-party services'},
  {id: 'your-rights', title: 'Your rights'},
  {id: 'children', title: "Children's privacy"},
  {id: 'changes', title: 'Changes to this policy'},
  {id: 'contact', title: 'Contact us'},
];

/** Where a section sits in `POLICY_SECTIONS`, one-based, for its heading. */
function numberOf(id: string): number {
  return POLICY_SECTIONS.findIndex(section => section.id === id) + 1;
}

function Section({id, children}: {id: string; children: ReactNode}): ReactElement {
  const spec = POLICY_SECTIONS.find(section => section.id === id);

  return (
    <section className="legal-section" id={id} aria-labelledby={`${id}-heading`}>
      <h2 className="legal-heading" id={`${id}-heading`}>
        <span className="legal-number">{numberOf(id)}</span>
        {spec?.title ?? id}
      </h2>
      {children}
    </section>
  );
}

/** The date pair, as the standalone page sets them: two labelled cells. */
export function PolicyDates(): ReactElement {
  return (
    <dl className="legal-dates">
      <div>
        <dt>Last updated</dt>
        <dd>
          <time dateTime={LEGAL.LAST_UPDATED}>{longDate(LEGAL.LAST_UPDATED)}</time>
        </dd>
      </div>
      <div>
        <dt>Effective</dt>
        <dd>
          <time dateTime={LEGAL.EFFECTIVE_FROM}>{longDate(LEGAL.EFFECTIVE_FROM)}</time>
        </dd>
      </div>
    </dl>
  );
}

/** Jump links. The standalone page carries these; the settings card does not. */
export function PolicyContents(): ReactElement {
  return (
    <nav className="legal-toc" aria-label="Sections of this policy">
      <ol>
        {POLICY_SECTIONS.map(section => (
          <li key={section.id}>
            <a href={`#${section.id}`}>{section.title}</a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** The document itself. */
export function PolicySections(): ReactElement {
  const email = LEGAL.PRIVACY_EMAIL;

  return (
    <>
    <Section id="introduction">
      <p>
        BeepMyDevice (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;)
        operates the BeepMyDevice mobile application and this dashboard. This
        policy explains our practices regarding the collection, use and
        protection of data.
      </p>
      <p>
        It applies to the app, the dashboard and the service behind them,
        which are one system.
      </p>
    </Section>

    <Section id="information-we-collect">
      <h3>What you give us</h3>
      <ul className="legal-list">
        <li>
          <b>Email address</b> — to create your account and sign you in.
        </li>
        <li>
          <b>Password</b> — stored only as a bcrypt hash, never as text we
          could read.
        </li>
        <li>
          <b>Device name and type</b> — iOS, Android, Windows or macOS, so a
          device is recognisable in a list.
        </li>
        <li>
          <b>WiFi network information</b> — the MAC address (BSSID) of the
          router a device is joined to. This is how devices on one network
          find each other, and it is the only thing that authorises an alert.
        </li>
        <li>
          <b>Push notification tokens</b> — issued by Apple or Google, so an
          alert can reach a device.
        </li>
      </ul>

      <h3>What the app reports on its own</h3>
      <ul className="legal-list">
        <li>Battery level of your registered devices.</li>
        <li>Device status — online, offline, or away from the network.</li>
        <li>Timestamps of alerts sent and received.</li>
        <li>
          Diagnostic logs: server-side records that a request happened, with
          the account and device it concerned. We do not log request bodies
          or passwords.
        </li>
      </ul>
    </Section>

    <Section id="how-we-use-it">
      <p>We use what we collect to:</p>
      <ul className="legal-list">
        <li>Authenticate you and manage your account.</li>
        <li>Recognise which devices share a WiFi network.</li>
        <li>Deliver alerts between those devices.</li>
        <li>Show device status and battery level.</li>
        <li>Diagnose faults and improve the service.</li>
        <li>Meet our legal obligations.</li>
      </ul>

      <div className="legal-callout">
        <p className="legal-callout-title">We do not:</p>
        <ul className="legal-list">
          <li>Sell your data, or share it with third parties.</li>
          <li>Use it for advertising or marketing.</li>
          <li>
            Collect location data. We store the router&rsquo;s MAC address as
            an identifier for a network; we do not request or record GPS or
            any other position.
          </li>
          <li>Track your behaviour or build a profile of you.</li>
        </ul>
      </div>
    </Section>

    <Section id="storage-and-security">
      <ul className="legal-list">
        <li>All traffic between your devices and us is encrypted (HTTPS).</li>
        <li>
          Passwords are hashed with bcrypt. A copy of our database contains no
          password anyone could read or reverse.
        </li>
        <li>
          Data is held in a PostgreSQL database on a private server, not
          reachable from the public internet.
        </li>
        <li>Access logs are kept and reviewed for security purposes.</li>
      </ul>
      <p>
        An alert can only be sent between devices that report the same router.
        Sharing a network is the permission; there is no way to ring a device
        from outside it.
      </p>
    </Section>

    <Section id="retention">
      <ul className="legal-list">
        <li>
          <b>Account data</b> — kept until you delete your account.
        </li>
        <li>
          <b>Alert and device activity</b> — kept for{' '}
          {LEGAL.ACTIVITY_RETENTION_DAYS} days, then erased.
        </li>
        <li>
          <b>Push notification tokens</b> — kept while the app is installed. A
          token the provider rejects is discarded.
        </li>
      </ul>
      <p>You can ask us to delete your data at any time.</p>
    </Section>

    <Section id="third-parties">
      <p>
        Two services carry our alerts. They receive a notification token and
        the alert itself; they receive no email address, no password and no
        network information.
      </p>

      <h3>Firebase Cloud Messaging (Android)</h3>
      <p>
        Used to deliver push notifications to Android devices. Google&rsquo;s
        privacy policy applies:{' '}
        <a href={LEGAL.GOOGLE_PRIVACY_URL} target="_blank" rel="noreferrer">
          {LEGAL.GOOGLE_PRIVACY_URL}
        </a>
      </p>

      <h3>Apple Push Notification service (iOS)</h3>
      <p>
        Used to deliver push notifications to Apple devices. Apple&rsquo;s
        privacy policy applies:{' '}
        <a href={LEGAL.APPLE_PRIVACY_URL} target="_blank" rel="noreferrer">
          {LEGAL.APPLE_PRIVACY_URL}
        </a>
      </p>
    </Section>

    <Section id="your-rights">
      <p>You have the right to:</p>
      <ul className="legal-list">
        <li>Access the personal data we hold about you.</li>
        <li>Correct it where it is wrong.</li>
        <li>Delete your account and everything associated with it.</li>
        <li>Receive an export of your data.</li>
        <li>Turn notifications off.</li>
      </ul>
      <p>
        Notifications are yours to control in <b>Settings → Notifications</b>,
        and a guest device is removed from your network there too. Access,
        export and deletion have no button yet — write to us and we will carry
        them out.
      </p>
      <p>
        To exercise any of these, contact <a href={`mailto:${email}`}>{email}</a>.
      </p>
    </Section>

    <Section id="children">
      <p>
        BeepMyDevice is not intended for children under {LEGAL.MINIMUM_AGE}. We
        do not knowingly collect data from children under {LEGAL.MINIMUM_AGE}.
        If we discover that we have, we delete it immediately.
      </p>
    </Section>

    <Section id="changes">
      <p>
        We may update this policy from time to time. Material changes are
        marked by the &ldquo;Last updated&rdquo; date at the top. Continuing to
        use BeepMyDevice after a change means you accept it.
      </p>
    </Section>

    <Section id="contact">
      <p>For privacy questions or a data request:</p>
      <ul className="legal-list">
        <li>
          Email: <a href={`mailto:${email}`}>{email}</a>
        </li>
        <li>
          Website:{' '}
          <a href={LEGAL.WEBSITE} target="_blank" rel="noreferrer">
            {LEGAL.WEBSITE}
          </a>
        </li>
      </ul>
    </Section>
    </>
  );
}
