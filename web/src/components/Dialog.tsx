/**
 * A modal.
 *
 * Escape closes it, a click on the backdrop closes it, focus moves into it on
 * open and returns to whatever opened it on close, and Tab is trapped inside
 * while it is up. None of that is decoration: a modal that leaves focus behind
 * it on the page is unusable with a keyboard, and it is the sort of thing
 * nobody notices until someone cannot use the product at all.
 */

import {useCallback, useEffect, useRef} from 'react';
import type {ReactElement, ReactNode} from 'react';

import {Icon} from '@/components/Icon';
import {ICON_SIZE} from '@/utils/constants';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

interface DialogProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** The action row. Rendered flush right, per the system. */
  actions?: ReactNode;
}

export function Dialog({title, onClose, children, actions}: DialogProps): ReactElement {
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  // Remember what had focus before the dialog opened, so it can be handed
  // back. Captured in a ref during the first render pass, before the dialog
  // itself takes focus.
  if (openerRef.current === null && typeof document !== 'undefined') {
    openerRef.current = document.activeElement as HTMLElement | null;
  }

  useEffect(() => {
    const panel = panelRef.current;
    if (panel === null) {
      return;
    }

    const first = panel.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel).focus();

    const opener = openerRef.current;
    return () => opener?.focus();
  }, []);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const panel = panelRef.current;
      if (panel === null) {
        return;
      }

      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (first === undefined || last === undefined) {
        return;
      }

      // Wrap at both ends, so Tab cannot walk out of the dialog and onto the
      // page behind it.
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  return (
    <div
      className="dialog-backdrop"
      /* The backdrop closes on its own clicks only. Without the target check,
         a click that starts inside the panel and drifts out on release would
         close the dialog mid-selection. */
      onMouseDown={event => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      onKeyDown={onKeyDown}
    >
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={panelRef}
      >
        <div style={{display: 'flex', alignItems: 'center', gap: 'var(--space-3)'}}>
          <h2 className="dialog-title" style={{flex: 1}}>
            {title}
          </h2>
          <button type="button" className="btn btn-ghost" onClick={onClose} aria-label="Close">
            <Icon name="x" size={ICON_SIZE.medium} />
          </button>
        </div>

        <div className="dialog-body">{children}</div>

        {actions !== undefined && <div className="dialog-actions">{actions}</div>}
      </div>
    </div>
  );
}
