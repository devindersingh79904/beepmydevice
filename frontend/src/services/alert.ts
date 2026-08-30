/** Alert API calls. */

import type {
  AlertLog,
  SendAlertRequest,
  SendAlertResponse,
} from '@types/device';
import type {PaginationMeta, PaginationParams} from '@types/api';

/**
 * Beep the target devices.
 *
 * An empty `device_ids` targets every device on the network. The response
 * carries per-device delivery status, so the UI can report partial success
 * rather than a single pass/fail.
 */
export async function sendAlert(
  payload: SendAlertRequest,
): Promise<SendAlertResponse> {
  throw new Error('Not implemented');
}

/** List past alerts, newest first. */
export async function getAlertLogs(
  params?: PaginationParams,
): Promise<{items: AlertLog[]; pagination: PaginationMeta}> {
  throw new Error('Not implemented');
}
