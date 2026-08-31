/**
 * Local toast queue for one screen.
 *
 * Purely presentational -- no service, no network -- so unlike the rest of
 * this directory it is implemented. One toast is visible at a time; a new one
 * replaces the current, because two stacked toasts obscure the content they
 * are commenting on.
 */

import {useCallback, useState} from 'react';

import type {ToastMessage, ToastTone} from '@/types/ui';

export interface UseToastResult {
  toast: ToastMessage | null;
  showToast: (tone: ToastTone, text: string) => void;
  dismissToast: () => void;
}

export function useToast(): UseToastResult {
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = useCallback((tone: ToastTone, text: string): void => {
    setToast({id: `${Date.now()}:${text}`, tone, text});
  }, []);

  const dismissToast = useCallback((): void => setToast(null), []);

  return {toast, showToast, dismissToast};
}
