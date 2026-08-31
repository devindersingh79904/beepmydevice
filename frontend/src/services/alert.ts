/** Alert API calls. */

import type {
  AlertLog,
  SendAlertRequest,
  SendAlertResponse,
} from '@/types/device';
import type {PaginationMeta, PaginationParams} from '@/types/api';
import {API_ROUTES} from '@utils/constants';

import {getPaginated, post} from './api';

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
  return post<SendAlertRequest, SendAlertResponse>(
    API_ROUTES.ALERT_SEND,
    payload,
  );
}

/** List past alerts, newest first. */
export async function getAlertLogs(
  params?: PaginationParams,
): Promise<{items: AlertLog[]; pagination: PaginationMeta}> {
  return getPaginated<AlertLog>(API_ROUTES.ALERT_LOGS, params);
}

/** List the alerts that targeted one device, newest first. */
export async function getDeviceAlertLogs(
  deviceId: string,
  params?: PaginationParams,
): Promise<{items: AlertLog[]; pagination: PaginationMeta}> {
  return getPaginated<AlertLog>(
    API_ROUTES.ALERT_LOGS_FOR_DEVICE(deviceId),
    params,
  );
}
