"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { pushChanges, pullChanges } from "../services/sync-service";
import type { SyncContext } from "../services/sync-context";

export function useSync() {
  const { status, data: session } = useSession();
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncContext = useMemo<SyncContext | undefined>(() => (
    session?.user?.tenantId && session.user.id && session.user.tenantSlug
      ? { tenantSlug: session.user.tenantSlug, userId: session.user.id }
      : undefined
  ), [session?.user?.id, session?.user?.tenantId, session?.user?.tenantSlug]);
  const isAuthenticated = status === 'authenticated' && Boolean(syncContext);

  const sync = useCallback(async () => {
    if (!navigator.onLine || !isAuthenticated) return;
    setIsSyncing(true);
    try {
      await pushChanges(syncContext);
      await pullChanges(syncContext);
    } finally {
      setIsSyncing(false);
    }
  }, [isAuthenticated, syncContext]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const handleOnline = () => {
      setIsOnline(true);
      sync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [isAuthenticated, sync]);

  return { isOnline, isSyncing, isAuthenticated, triggerSync: sync, performFullSync: sync };
}
