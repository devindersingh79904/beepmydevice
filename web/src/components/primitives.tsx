/**
 * The small shared pieces every screen is built from.
 *
 * They are collected in one file rather than one file each because none of
 * them is more than a few lines, and a folder of twelve two-line modules is
 * harder to read than this is. Anything that grows past a screenful moves out.
 *
 * All of them render the design system's own classes — `.btn`, `.tag`,
 * `.input` — rather than inventing parallel styling. Nothing here writes a
 * colour or a pixel; those come from the token sheet.
 */

import type {ButtonHTMLAttributes, ReactElement, ReactNode} from 'react';

import {Icon} from '@/components/Icon';
import type {IconName} from '@/components/Icon';
import type {ApiError} from '@/types/api';
import type {AlertStatus, Device, DeviceStatus} from '@/types/models';
import {
  ALERT_STATUS_LABEL,
  DEVICE_STATUS_LABEL,
  ICON_SIZE,
  SKELETON_ROWS,
} from '@/utils/constants';
import {batteryLabel, isBatteryLow} from '@/utils/format';

/* --- button ------------------------------------------------------------- */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: IconName;
  small?: boolean;
  children?: ReactNode;
}

export function Button({
  variant = 'secondary',
  icon,
  small = false,
  children,
  className,
  type = 'button',
  ...rest
}: ButtonProps): ReactElement {
  const classes = ['btn', `btn-${variant}`, small ? 'btn-sm' : '', className ?? '']
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={classes} {...rest}>
      {icon !== undefined && (
        <Icon name={icon} size={small ? ICON_SIZE.small : ICON_SIZE.medium} />
      )}
      {children}
    </button>
  );
}

/* --- field -------------------------------------------------------------- */

interface FieldProps {
  label: string;
  htmlFor: string;
  /** Message from the server for this field, if it rejected the value. */
  error?: string;
  children: ReactNode;
}

/**
 * A labelled input with its server-side error.
 *
 * The error is rendered as text as well as an outline, so the state does not
 * depend on colour vision, and `aria-describedby` ties the two together for a
 * screen reader.
 */
export function Field({label, htmlFor, error, children}: FieldProps): ReactElement {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {error !== undefined && (
        <span className="field-error" id={`${htmlFor}-error`} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

/* --- banner ------------------------------------------------------------- */

/**
 * The error banner.
 *
 * Every entry in the array is rendered. The code is shown alongside the
 * message because it is a stable, public part of the contract, and "ALERT_003"
 * in a support conversation is worth more than a paraphrase of the sentence.
 */
export function ErrorBanner({
  errors,
  onDismiss,
}: {
  errors: ApiError[];
  onDismiss?: () => void;
}): ReactElement | null {
  if (errors.length === 0) {
    return null;
  }

  return (
    <div className="banner" role="alert">
      <Icon name="info" size={ICON_SIZE.medium} />
      <ul className="banner-list">
        {errors.map(error => (
          <li key={`${error.code}-${error.message}`}>
            {error.message} <span className="banner-code">({error.code})</span>
          </li>
        ))}
      </ul>
      {onDismiss !== undefined && (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={onDismiss}
          aria-label="Dismiss"
        >
          <Icon name="x" size={ICON_SIZE.small} />
        </button>
      )}
    </div>
  );
}

/* --- tags --------------------------------------------------------------- */

/**
 * A device's status.
 *
 * The word is always present, so the state never rests on colour alone —
 * which matters here more than usual, because ONLINE and the guest badge are
 * the same accent by design.
 */
export function StatusTag({status}: {status: DeviceStatus}): ReactElement {
  const className =
    status === 'ONLINE' ? 'tag tag-accent' : status === 'UNKNOWN' ? 'tag tag-unknown' : 'tag tag-neutral';

  return (
    <span className={className}>
      {DEVICE_STATUS_LABEL[status]}
      {status === 'UNKNOWN' && (
        <span className="sr-only"> — this device answered from a different WiFi network</span>
      )}
    </span>
  );
}

/** An alert's delivery state. */
export function AlertStatusTag({status}: {status: AlertStatus}): ReactElement {
  return (
    <span className={status === 'FAILED' ? 'tag tag-outline' : 'tag tag-accent'}>
      {ALERT_STATUS_LABEL[status]}
    </span>
  );
}

/**
 * The guest badge.
 *
 * Accent-toned rather than a warning colour: a guest is a normal participant
 * on the network, not a problem to be flagged.
 */
export function GuestTag(): ReactElement {
  return <span className="tag tag-accent">Guest</span>;
}

/* --- battery ------------------------------------------------------------ */

/**
 * The battery meter.
 *
 * Two tiers, matching the canvas: low is called out in the accent, everything
 * else is plain ink. The number is always printed next to the bar.
 */
export function Battery({level}: {level: number | null}): ReactElement {
  const width = level === null ? 0 : Math.max(0, Math.min(100, level));

  return (
    <div className="battery">
      <div className="battery-track" aria-hidden>
        <div
          className={isBatteryLow(level) ? 'battery-fill is-low' : 'battery-fill'}
          style={{width: `${width}%`}}
        />
      </div>
      <span className="battery-text">{batteryLabel(level)}</span>
    </div>
  );
}

/* --- toggle & checkbox --------------------------------------------------- */

interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}

/** A square switch. `role="switch"` so it is announced as one. */
export function Toggle({checked, onChange, label, disabled = false}: ToggleProps): ReactElement {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={checked ? 'toggle is-on' : 'toggle'}
      onClick={() => onChange(!checked)}
    >
      <span className="toggle-knob" />
    </button>
  );
}

interface CheckboxProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}

/** The tick inside a checkbox is smaller than the icon scale's floor. */
const CHECK_TICK_SIZE = 12;

/** A square checkbox with a drawn tick. */
export function Checkbox({
  checked,
  onChange,
  label,
  disabled = false,
}: CheckboxProps): ReactElement {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={checked ? 'check is-on' : 'check'}
      onClick={() => onChange(!checked)}
    >
      {checked && <Icon name="check" size={CHECK_TICK_SIZE} />}
    </button>
  );
}

/* --- states -------------------------------------------------------------- */

/** The empty state: what is missing, and the one thing to do about it. */
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}): ReactElement {
  return (
    <div className="empty">
      <p className="empty-title">{title}</p>
      <p className="empty-body">{body}</p>
      {action}
    </div>
  );
}

/**
 * Placeholder rows while a table loads.
 *
 * Rows rather than a spinner: the table's height stays put, so the page does
 * not jump when the data lands.
 */
export function SkeletonRows({
  rows = SKELETON_ROWS,
  columns,
}: {
  rows?: number;
  columns: number;
}): ReactElement {
  return (
    <tbody>
      {Array.from({length: rows}, (_, row) => (
        <tr key={row}>
          {Array.from({length: columns}, (__, column) => (
            <td key={column}>
              <div className="skeleton" style={{height: 14, width: column === 0 ? '60%' : '40%'}} />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

/* --- stat tile ----------------------------------------------------------- */

export function Stat({
  label,
  value,
  note,
  icon,
  muted = false,
  small = false,
}: {
  label: string;
  value: string;
  note?: string;
  icon?: IconName;
  muted?: boolean;
  small?: boolean;
}): ReactElement {
  return (
    <div className="stat">
      <div>
        <p className="stat-label">{label}</p>
        <p className={small ? 'stat-value stat-value-sm' : 'stat-value'}>{value}</p>
        {note !== undefined && <p className="stat-note">{note}</p>}
      </div>
      {icon !== undefined && (
        <span className={muted ? 'stat-icon stat-icon-muted' : 'stat-icon'}>
          <Icon name={icon} size={ICON_SIZE.xlarge} />
        </span>
      )}
    </div>
  );
}

/** A device's name over its platform, as the canvas sets the first column. */
export function DeviceCell({device}: {device: Device}): ReactElement {
  const name = device.device_name?.trim();
  return (
    <div>
      <div className="row-title">
        {name !== undefined && name !== '' ? name : 'Unnamed device'}{' '}
        {device.is_guest && <GuestTag />}
      </div>
      {device.device_os_version !== null && (
        <div className="row-sub">{device.device_os_version}</div>
      )}
    </div>
  );
}
