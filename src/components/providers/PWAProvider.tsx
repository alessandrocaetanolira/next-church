"use client";

import { useEffect, useRef } from 'react';
import { useSync } from '@/features/sync/hooks/use-sync';

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const { performFullSync, isAuthenticated } = useSync();

  const hasRun = useRef(false);

  useEffect(() => {
    if (!hasRun.current && isAuthenticated) {
      void performFullSync();
      hasRun.current = true;
    }
    // performFullSync is supplied by the sync hook and is intentionally not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  return <>{children}</>;
}
