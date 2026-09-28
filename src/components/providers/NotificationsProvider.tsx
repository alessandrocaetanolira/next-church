'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { initializeNotificationCenter, upsertNotification } from '@/lib/notification-center';
import { openNotificationStream } from '@/services/notification-stream';
import { useAuthStore } from '@/features/auth/store';
import { playNotificationBeep } from '@/lib/notification-sound';

type NotificationEventPayload = {
  id: string;
  senderEmail?: string | null;
  senderName?: string | null;
  type: string;
  title: string;
  message: string;
  href?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
  createdAt: string;
};

export function NotificationsProvider() {
  const { isAuthenticated, refreshSession } = useAuth();
  const updateAccess = useAuthStore((state) => state.updateAccess);

  useEffect(() => {
    if (!isAuthenticated) return;

    void initializeNotificationCenter();

    const handleServiceWorkerMessage = (event: MessageEvent<{ type?: string; notificationId?: string }>) => {
      if (event.data?.type !== 'church:push-notification') return;
      playNotificationBeep(event.data.notificationId ?? 'push-notification');
    };
    navigator.serviceWorker?.addEventListener('message', handleServiceWorkerMessage);

    const refresh = () => { void initializeNotificationCenter(true); };
    const close = openNotificationStream((data) => {
      try {
        const notification = data.notification as NotificationEventPayload | undefined;
        if (data.type === 'permissions.updated') {
          const access: Parameters<typeof updateAccess>[0] = {};
          if (data.role) access.role = data.role.toUpperCase() as 'ADMIN' | 'PASTOR' | 'LEADER' | 'MEMBER';
          if (Array.isArray(data.permissions)) access.permissions = data.permissions;
          updateAccess(access);
          void refreshSession();
          return;
        }
        if (data.type !== 'notification' || !notification) return;

        if (notification.type === 'feed.post.created') {
          window.dispatchEvent(new CustomEvent('church:feed-post-created', { detail: notification }));
          return;
        }

        if (notification.type === 'canteen-order-archived') {
          window.dispatchEvent(new CustomEvent('church:canteen-order-updated', { detail: notification }));
          return;
        }

        const added = upsertNotification(notification);
        if (added) {
          toast.info(notification.title, {
            description: notification.message,
          });
        }
      } catch (error) {
        console.error('Erro ao processar SSE de notificações:', error);
      }
    }, (connected) => {
      window.dispatchEvent(new CustomEvent('church:notification-stream-status', {
        detail: { connected },
      }));
    });
    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', refresh);

    return () => {
      close();
      navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage);
      window.removeEventListener('online', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [isAuthenticated, refreshSession, updateAccess]);

  return null;
}
