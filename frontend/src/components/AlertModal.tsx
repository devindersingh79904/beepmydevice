/**
 * Alert confirmation dialog.
 *
 * Shows the target and its network before sending, so the sender can see what
 * is about to make noise and in which room.
 */

import React from 'react';

import type {Device} from '@types/device';

interface AlertModalProps {
  device: Device | null;
  visible: boolean;
  isSending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function AlertModal({
  device,
  visible,
  isSending,
  onConfirm,
  onCancel,
}: AlertModalProps): React.JSX.Element {
  throw new Error('Not implemented');
}
