"use client";

import { useEffect, useRef } from 'react';
import { useSync } from '@/features/sync/hooks/use-sync';

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const { performFullSync, isAuthenticated } = useSync();

  const hasRun = useRef(false);

  useEffect(() => {
    if ('serviceWorker' in navigator && (window.isSecureContext || window.location.hostname === 'localhost')) {
      void navigator.serviceWorker
        .register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        })
        .then((registration) => {
          void registration.update();
          console.log('SW registrado:', registration.scope);
        })
        .catch((error) => {
          console.log('SW falhou:', error);
        });
    }

    if (!hasRun.current && isAuthenticated) {
      void performFullSync();
      hasRun.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  return <>{children}</>;
}
