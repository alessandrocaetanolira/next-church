"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { pushChanges, pullChanges } from "../services/sync-service";
import { resolveSyncConflict, type ConflictResolution } from "../services/sync-service";
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type SyncQueueItem } from '@/lib/db';

export type SyncIssue = 'unauthorized' | 'partial' | null;
import type { SyncContext } from "../services/sync-context";

export function useSync() {
  const { status, data: session } = useSession();
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncIssue, setSyncIssue] = useState<SyncIssue>(null);
  const syncContext = useMemo<SyncContext | undefined>(() => (
    session?.user?.tenantId && session.user.id && session.user.tenantSlug
      ? { tenantId: session.user.tenantId, tenantSlug: session.user.tenantSlug, userId: session.user.id }
      : undefined
  ), [session?.user?.id, session?.user?.tenantId, session?.user?.tenantSlug]);
  const isAuthenticated = status === 'authenticated' && Boolean(syncContext);
  const conflicts = useLiveQuery(
    () => syncContext
      ? db.syncQueue.filter((item) => item.status === 'conflict' && item.tenantSlug === syncContext.tenantSlug && item.userId === syncContext.userId).toArray()
      : [],
    [syncContext?.tenantSlug, syncContext?.userId],
  ) ?? [];

  const sync = useCallback(async () => {
    if (!navigator.onLine || !isAuthenticated) return;
    setIsSyncing(true);
    try {
      const pushResult = await pushChanges(syncContext);
      if ('unauthorized' in pushResult && pushResult.unauthorized) {
        setSyncIssue('unauthorized');
        return;
      }
      if (!pushResult.ok && !pushResult.skipped) setSyncIssue('partial');

      const pullResult = await pullChanges(syncContext);
      if ('unauthorized' in pullResult && pullResult.unauthorized) {
        setSyncIssue('unauthorized');
        return;
      }
      if (pullResult.ok) setSyncIssue(null);
    } finally {
      setIsSyncing(false);
    }
  }, [isAuthenticated, syncContext]);

  const resolveConflict = useCallback(async (itemId: number, resolution: ConflictResolution) => {
    const resolved = await resolveSyncConflict(itemId, resolution, syncContext);
    if (resolved && resolution === 'server') await pullChanges(syncContext);
    return resolved;
  }, [syncContext]);

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

  return { isOnline, isSyncing, isAuthenticated, syncIssue, conflicts: conflicts as SyncQueueItem[], resolveConflict, triggerSync: sync, performFullSync: sync };
}
