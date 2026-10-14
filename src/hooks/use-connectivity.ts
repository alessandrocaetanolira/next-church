'use client';

import { useSyncExternalStore } from 'react';

function subscribe(listener: () => void) {
  window.addEventListener('online', listener);
  window.addEventListener('offline', listener);
  return () => {
    window.removeEventListener('online', listener);
    window.removeEventListener('offline', listener);
  };
}

/** Estado reativo da conectividade reportada pelo navegador, com SSR estável. */
export function useConnectivity() {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
}
