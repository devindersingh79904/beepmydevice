/**
 * Sending alerts, and the outcome of the last send.
 *
 * Screens never call `services/alert.ts` directly, so this is the seam between
 * the dashboard's confirm dialog and the API. The hook owns the in-flight flag
 * because the dialog must stay open, and un-dismissable, while a send is on
 * the wire.
 *
 * Implementation is Phase 1, like the other hooks in this directory.
 */

import type {AlertDeliveryStatus} from '@/types/device';

export interface UseAlertsResult {
  /** True from the moment a send starts until its response lands. */
  isSending: boolean;
  /** Per-device outcome of the most recent send, for reporting partial delivery. */
  lastDelivery: AlertDeliveryStatus[];
  /**
   * Beep the given devices.
   *
   * An empty array targets every device on the network. Resolves to true when
   * the send was accepted; errors reach the screen through the error context,
   * not as a rejected promise, so a failed send does not need a try/catch at
   * every call site.
   */
  sendAlert: (deviceIds: string[]) => Promise<boolean>;
}

export function useAlerts(): UseAlertsResult {
  throw new Error('Not implemented');
}
