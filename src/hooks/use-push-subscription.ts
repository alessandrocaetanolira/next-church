'use client';

import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { pushApi } from '@/services/api/push';

function decodeVapidKey(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const decoded = window.atob((value + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

async function waitForServiceWorkerReady(timeoutMs = 8_000) {
  const registration = await navigator.serviceWorker.getRegistration('/');
  console.info('[push-client] estado do service worker', {
    found: Boolean(registration),
    scope: registration?.scope,
    active: Boolean(registration?.active),
    installing: Boolean(registration?.installing),
    waiting: Boolean(registration?.waiting),
  });

  const timeout = new Promise<never>((_, reject) => {
    window.setTimeout(() => reject(new Error('O Service Worker não ficou ativo. Feche e abra o app após executar o build de produção.')), timeoutMs);
  });
  return Promise.race([navigator.serviceWorker.ready, timeout]);
}

type PushSubscriptionState = {
  supported: boolean;
  supportIssue: string | null;
  permission: NotificationPermission;
  subscribed: boolean;
  loading: boolean;
  error: string | null;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
};

const PushSubscriptionContext = createContext<PushSubscriptionState | null>(null);

function usePushSubscriptionState(): PushSubscriptionState {
  const supportIssue = typeof window === 'undefined'
    ? null
    : !window.isSecureContext
      ? 'Notificações Push exigem HTTPS válido ou localhost.'
      : !('Notification' in window)
        ? 'Este navegador não oferece a API de notificações.'
        : !('serviceWorker' in navigator)
          ? 'Este navegador não oferece Service Worker.'
          : !('PushManager' in window)
            ? 'Este navegador não oferece Web Push.'
            : null;
  const supported = supportIssue === null;
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    typeof Notification === 'undefined' ? 'default' : Notification.permission,
  );
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const registerCurrentSubscription = useCallback(async () => {
    if (!supported) return false;
    const registration = await waitForServiceWorkerReady();
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return false;
    await pushApi.register(subscription.toJSON());
    setSubscribed(true);
    return true;
  }, [supported]);

  useEffect(() => {
    void registerCurrentSubscription().catch(() => setSubscribed(false));
  }, [registerCurrentSubscription]);

  const subscribe = useCallback(async () => {
    console.info('[push-client] início da ativação', { supported, permission: typeof Notification === 'undefined' ? 'unsupported' : Notification.permission });
    if (!supported) return false;
    setLoading(true);
    setError(null);
    try {
      const nextPermission = await Notification.requestPermission();
      console.info('[push-client] permissão retornada', nextPermission);
      setPermission(nextPermission);
      if (nextPermission !== 'granted') {
        if (nextPermission === 'denied') setError('A permissão foi bloqueada pelo navegador. Reative-a nas configurações do site.');
        return false;
      }
      console.info('[push-client] aguardando service worker');
      const registration = await waitForServiceWorkerReady();
      console.info('[push-client] service worker pronto', { scope: registration.scope, active: Boolean(registration.active) });
      const subscription = await registration.pushManager.getSubscription()
        ?? await (async () => {
          console.info('[push-client] buscando chave VAPID');
          const { publicKey } = await pushApi.publicKey();
          if (!publicKey) throw new Error('A chave pública VAPID não está configurada no servidor.');
          const created = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: decodeVapidKey(publicKey),
          });
          console.info('[push-client] subscription criada', { endpoint: created.endpoint.slice(0, 80) });
          return created;
        })();
      console.info('[push-client] subscription pronta para registrar', { endpoint: subscription.endpoint.slice(0, 80), hasKeys: Boolean(subscription.toJSON().keys) });
      await pushApi.register(subscription.toJSON());
      console.info('[push-client] subscription registrada no backend');
      setSubscribed(true);
      return true;
    } catch (cause) {
      console.error('[push-client] falha na ativação', cause);
      setError(cause instanceof Error ? cause.message : 'Não foi possível ativar as notificações.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [supported]);

  const unsubscribe = useCallback(async () => {
    if (!supported) return false;
    setLoading(true);
    setError(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await pushApi.remove(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setSubscribed(false);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível desativar as notificações.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [supported]);

  return useMemo(() => ({ supported, supportIssue, permission, subscribed, loading, error, subscribe, unsubscribe }), [supported, supportIssue, permission, subscribed, loading, error, subscribe, unsubscribe]);
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
