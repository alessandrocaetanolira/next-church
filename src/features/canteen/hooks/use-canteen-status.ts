'use client';

import { useCallback, useEffect, useState } from 'react';
import { canteenOperationsApi, type CanteenStatus } from '../api/operations.api';

const UNKNOWN_STATUS: CanteenStatus = { isOpen: false, openedAt: null };

/** Estado operacional compartilhável entre PDV e checkout.
 * O servidor continua sendo a fonte de verdade na confirmação da venda. */
export function useCanteenStatus(enabled = true) {
  const [status, setStatus] = useState<CanteenStatus>(UNKNOWN_STATUS);
  const [loading, setLoading] = useState(enabled);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      setStatus(await canteenOperationsApi.status());
    } catch {
      // Não assumimos que a cantina esteja aberta quando o estado não pôde ser confirmado.
      setStatus(UNKNOWN_STATUS);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.removeEventListener('online', refresh);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [refresh]);

  return { status, loading, refresh };
}
