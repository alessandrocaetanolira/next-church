"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { pushChanges, pullChanges } from "../services/sync-service";

export function useSync() {
  const { status, data: session } = useSession();
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState(false);
  const isAuthenticated = status === 'authenticated' && Boolean(session?.user?.tenantId);

  const sync = useCallback(async () => {
    if (!navigator.onLine || !isAuthenticated) return;
    setIsSyncing(true);
    try {
      await pushChanges();
      await pullChanges();
    } finally {
      setIsSyncing(false);
    }
  }, [isAuthenticated]);

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
