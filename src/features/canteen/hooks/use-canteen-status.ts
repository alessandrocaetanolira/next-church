'use client';

import { useCallback, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { CanteenStatus } from '../api/operations.api';
import { useCanteenOperationStore } from '../store/useCanteenOperationStore';

const UNKNOWN_STATUS: CanteenStatus = { isOpen: false, openedAt: null };

/** Uma única fonte de estado para cabeçalho, PDV, pedidos e checkout.
 * O servidor continua sendo a fonte de verdade na confirmação da venda. */
export function useCanteenStatus(enabled = true) {
  const { user } = useAuth();
  const identity = user?.id || user?.email;
  const scopeKey = enabled && user?.tenantId && identity ? JSON.stringify([user.tenantId, identity]) : null;
  const state = useCanteenOperationStore();
  const { refresh: refreshStatus, setOpen: updateStatus, reset } = state;
  const refresh = useCallback(() => scopeKey ? refreshStatus(scopeKey) : Promise.resolve(null), [scopeKey, refreshStatus]);
  const setOpen = useCallback((isOpen: boolean) => {
    if (!scopeKey) return Promise.reject(new Error('Sessão indisponível.'));
    return updateStatus(scopeKey, isOpen);
  }, [scopeKey, updateStatus]);

  useEffect(() => {
    if (!enabled) return;
    if (!scopeKey) { reset(); return; }
    void refresh();
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    window.addEventListener('online', refresh);
    window.addEventListener('focus', refreshWhenVisible);
    window.addEventListener('church:canteen-status-updated', refreshWhenVisible);
    const refreshOnReconnect = (event: Event) => {
      if ((event as CustomEvent<{ connected?: boolean }>).detail?.connected) refreshWhenVisible();
    };
    window.addEventListener('church:notification-stream-status', refreshOnReconnect);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.removeEventListener('online', refresh);
      window.removeEventListener('focus', refreshWhenVisible);
      window.removeEventListener('church:canteen-status-updated', refreshWhenVisible);
      window.removeEventListener('church:notification-stream-status', refreshOnReconnect);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [enabled, refresh, scopeKey, reset]);

  const matchesScope = scopeKey !== null && state.scopeKey === scopeKey;
  const status = matchesScope ? state.status ?? UNKNOWN_STATUS : UNKNOWN_STATUS;
  const loading = Boolean(scopeKey) && (!matchesScope || state.loading);
  const error = matchesScope ? state.error : null;
  const confirmed = matchesScope && state.status !== null && !error;
  const updating = matchesScope && state.updating;
  return { status, loading, error, confirmed, updating, refresh, setOpen,
    canCheckout: confirmed && status.isOpen && !loading && !updating };
}
