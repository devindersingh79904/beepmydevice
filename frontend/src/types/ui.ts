/** Types for presentation-only state that hooks and components share. */

/**
 * Tone of a transient message.
 *
 * Lives here rather than beside `components/Toast` so `hooks/useToast` can own
 * the queue without a hook importing from a component.
 */
export type ToastTone = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  tone: ToastTone;
  text: string;
}
