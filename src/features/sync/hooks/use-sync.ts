"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { pushChanges, pullChanges } from "../services/sync-service";

export function useSync() {
  const { status, data: session } = useSession();
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState(false);
  const isAuthenticated = status === 'authenticated' && Boolean(session?.user?.tenantId);

  const sync = async () => {
    if (!navigator.onLine || !isAuthenticated) return;
    setIsSyncing(true);
    await pushChanges();
    await pullChanges();
    setIsSyncing(false);
  };

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
  }, [isAuthenticated]);

  return { isOnline, isSyncing, isAuthenticated, triggerSync: sync, performFullSync: sync };
}
