'use client';

import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { pushApi } from '@/services/api/push';
import { decodeVapidKey, pushStep, pushSupportIssue, readyPushWorker } from '@/services/push-browser';

type PushPhase = 'idle' | 'checking' | 'unsupported' | 'prompt' | 'blocked' | 'pending' | 'enabling' | 'disabling' | 'enabled' | 'error';
type Snapshot = { phase: PushPhase; permission: NotificationPermission; error: string | null; supportIssue: string | null };
type Operation = { kind: 'refresh' | 'subscribe' | 'unsubscribe'; controller: AbortController; promise: Promise<boolean> };
type PushSubscriptionState = Snapshot & {
  supported: boolean;
  subscribed: boolean;
  statusChecked: boolean;
  loading: boolean;
  refresh: () => Promise<boolean>;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
};
const initial: Snapshot = { phase: 'idle', permission: 'default', error: null, supportIssue: null };
const PushSubscriptionContext = createContext<PushSubscriptionState | null>(null);

function usePushSubscriptionState(): PushSubscriptionState {
  const { data: session, status } = useSession();
  const user = session?.user;
  const identity = status === 'authenticated' && user?.id
    ? JSON.stringify([Boolean(user.isPlatformAdmin), user.tenantId ?? '', user.id]) : null;
  const [snapshot, setSnapshot] = useState<Snapshot>(initial);
  const operation = useRef<Operation | null>(null);

  /**
   * Serializa verificação, ativação e desativação. A sessão delimita o ciclo:
   * cancelamentos impedem resultados antigos de atualizar a UI ou iniciar um
   * POST para a próxima conta. A reconciliação nunca pede permissão ao sistema.
   */
  const run = useCallback((kind: Operation['kind']): Promise<boolean> => {
    if (!identity) return Promise.resolve(false);
    const previous = operation.current;
    if (previous) {
      if (kind === 'refresh' || previous.kind !== 'refresh') return previous.promise;
      previous.controller.abort();
    }
    const controller = new AbortController();
    const { signal } = controller;
    const current: Operation = { kind, controller, promise: Promise.resolve(false) };
    operation.current = current;
    const commit = (next: Snapshot) => { if (!signal.aborted) setSnapshot(next); };
    const task = async () => {
      const supportIssue = pushSupportIssue();
      let permission: NotificationPermission = typeof Notification === 'undefined' ? 'default' : Notification.permission;
      const result = (phase: PushPhase, error: string | null = null) => commit({ phase, permission, error, supportIssue });
      try {
        if (supportIssue) { result('unsupported'); return false; }
        if (kind !== 'unsubscribe' && permission === 'denied') { result('blocked'); return false; }
        if (kind === 'refresh' && permission !== 'granted') { result('prompt'); return false; }
        result(kind === 'refresh' ? 'checking' : kind === 'subscribe' ? 'enabling' : 'disabling');
        if (kind === 'subscribe' && permission === 'default') {
          // Direto no clique, antes de qualquer await de rede/SW.
          permission = await pushStep(Notification.requestPermission(), signal,
            'A autorização não foi concluída. Tente novamente.', 60_000);
          if (permission !== 'granted') { result(permission === 'denied' ? 'blocked' : 'prompt'); return false; }
        }
        const registration = await readyPushWorker(signal);
        const subscription = await pushStep(registration.pushManager.getSubscription(), signal,
          'Não foi possível verificar as notificações. Tente novamente.');
        if (kind === 'unsubscribe') {
          if (subscription) {
            await pushStep(pushApi.remove(subscription.endpoint, signal), signal, 'Não foi possível desativar os alertas. Tente novamente.');
            const removed = await pushStep(subscription.unsubscribe(), signal, 'Não foi possível desativar os alertas. Tente novamente.');
            if (!removed) throw new Error('Não foi possível desativar os alertas. Tente novamente.');
          }
          result('pending');
          return true;
        }
        if (!subscription && kind === 'refresh') { result('pending'); return false; }
        let activeSubscription = subscription;
        if (!activeSubscription) {
          const { publicKey } = await pushStep(pushApi.publicKey(signal), signal,
            'Não foi possível conectar ao serviço de notificações. Tente novamente.');
          if (!publicKey) throw new Error('As notificações estão temporariamente indisponíveis.');
          activeSubscription = await pushStep(registration.pushManager.subscribe({
            userVisibleOnly: true, applicationServerKey: decodeVapidKey(publicKey),
          }), signal, 'Não foi possível ativar as notificações. Tente novamente.');
        }
        if (signal.aborted) return false;
        await pushStep(pushApi.register(activeSubscription.toJSON(), signal), signal,
          'Não foi possível concluir a ativação. Verifique sua conexão e tente novamente.');
        permission = Notification.permission;
        result(permission === 'granted' ? 'enabled' : permission === 'denied' ? 'blocked' : 'prompt');
        return permission === 'granted';
      } catch (cause) {
        if (!signal.aborted) result('error', cause instanceof Error ? cause.message : 'Não foi possível ativar as notificações.');
        return false;
      } finally {
        controller.abort();
        if (operation.current === current) operation.current = null;
      }
    };
    current.promise = task();
    return current.promise;
  }, [identity]);

  const refresh = useCallback(() => run('refresh'), [run]);
  const subscribe = useCallback(() => run('subscribe'), [run]);
  const unsubscribe = useCallback(() => run('unsubscribe'), [run]);

  useEffect(() => {
    setSnapshot(initial);
    if (identity) void refresh();
    return () => {
      operation.current?.controller.abort();
      operation.current = null;
    };
  }, [identity, refresh]);

  useEffect(() => {
    if (!identity || pushSupportIssue()) return;
    let disposed = false;
    let permissionStatus: PermissionStatus | undefined;
    const recheck = () => { if (!disposed && document.visibilityState === 'visible') void refresh(); };
    window.addEventListener('focus', recheck);
    window.addEventListener('pageshow', recheck);
    window.addEventListener('online', recheck);
    document.addEventListener('visibilitychange', recheck);
    navigator.serviceWorker.addEventListener('controllerchange', recheck);
    void navigator.serviceWorker.ready.then(recheck).catch(() => undefined);
    void navigator.permissions?.query({ name: 'notifications' as PermissionName }).then((value) => {
      if (disposed) return;
      permissionStatus = value;
      value.addEventListener('change', recheck);
    }).catch(() => undefined);
    return () => {
      disposed = true;
      window.removeEventListener('focus', recheck);
      window.removeEventListener('pageshow', recheck);
      window.removeEventListener('online', recheck);
      document.removeEventListener('visibilitychange', recheck);
      navigator.serviceWorker.removeEventListener('controllerchange', recheck);
      permissionStatus?.removeEventListener('change', recheck);
    };
  }, [identity, refresh]);

  return useMemo(() => ({ ...snapshot,
    supported: !snapshot.supportIssue,
    subscribed: snapshot.phase === 'enabled',
    statusChecked: snapshot.phase !== 'idle' && snapshot.phase !== 'checking',
    loading: ['checking', 'enabling', 'disabling'].includes(snapshot.phase),
    refresh, subscribe, unsubscribe,
  }), [snapshot, refresh, subscribe, unsubscribe]);
}

export function PushSubscriptionProvider({ children }: { children: React.ReactNode }) {
  const value = usePushSubscriptionState();
  return createElement(PushSubscriptionContext.Provider, { value }, children);
}

export function usePushSubscription() {
  const context = useContext(PushSubscriptionContext);
  if (!context) throw new Error('usePushSubscription deve ser usado dentro de PushSubscriptionProvider.');
  return context;
}
