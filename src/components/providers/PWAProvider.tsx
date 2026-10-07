"use client";

import { useEffect, useRef, useState } from 'react';
import { useSync } from '@/features/sync/hooks/use-sync';
import { PwaOnboarding } from '@/components/pwa/PwaOnboarding';
import { PushSubscriptionProvider } from '@/hooks/use-push-subscription';

function PWASyncEffect() {
  const { performFullSync, isAuthenticated } = useSync();
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current || !isAuthenticated || typeof window === 'undefined' || !window.navigator.onLine) return;

    hasRun.current = true;
    void performFullSync().catch((error: unknown) => {
      // A sincronização inicial não pode impedir a renderização do aplicativo.
      console.warn('[PWA] sincronização inicial indisponível:', error);
    });
  }, [isAuthenticated, performFullSync]);

  return null;
}

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' && 'serviceWorker' in navigator) {
      void navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => void registration.unregister());
      });
      void caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))));
    }
    setMounted(true);
  }, []);

  return (
    <PushSubscriptionProvider>
      {children}
      {mounted ? <PWASyncEffect /> : null}
      {mounted ? <PwaOnboarding /> : null}
    </PushSubscriptionProvider>
  );
}
