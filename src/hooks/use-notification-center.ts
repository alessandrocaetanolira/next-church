'use client';

import { useEffect, useSyncExternalStore } from 'react';
import {
  getNotificationSnapshot,
  getUnreadNotificationCount,
  initializeNotificationCenter,
  subscribeNotificationCenter,
} from '@/lib/notification-center';

export function useNotificationCenter() {
  const notifications = useSyncExternalStore(
    subscribeNotificationCenter,
    getNotificationSnapshot,
    getNotificationSnapshot
  );

  useEffect(() => {
    void initializeNotificationCenter();
  }, []);

  return {
    notifications,
    unreadCount: getUnreadNotificationCount(),
  };
}
