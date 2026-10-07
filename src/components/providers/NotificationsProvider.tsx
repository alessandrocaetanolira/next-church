'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { initializeNotificationCenter, upsertNotification } from '@/lib/notification-center';
import { openNotificationStream } from '@/services/notification-stream';
import { useAuthStore } from '@/features/auth/store';
import { playNotificationBeep } from '@/lib/notification-sound';
import { presenceApi } from '@/services/presence-api';

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
  const { isAuthenticated, refreshSession, user } = useAuth();
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
    const heartbeat = () => {
      if (!navigator.onLine || !user?.tenantId) return;
      void presenceApi.heartbeat().catch(() => undefined);
    };
    heartbeat();
    const heartbeatTimer = window.setInterval(heartbeat, 40_000);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') heartbeat();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    const close = openNotificationStream((data) => {
      try {
        const notification = data.notification as NotificationEventPayload | undefined;
        if (data.type === 'permissions.updated') {
          const access: Parameters<typeof updateAccess>[0] = {};
          if (data.role) access.role = data.role.toUpperCase() as 'ADMIN' | 'PASTOR' | 'LEADER' | 'CANTEEN' | 'MEMBER';
          if (Array.isArray(data.permissions)) access.permissions = data.permissions;
          updateAccess(access);
          void refreshSession().then((session) => {
            const refreshedUser = session?.user as ({ role?: string; permissions?: string[]; planFeatures?: string[]; teamIds?: string[] } | undefined);
            if (!refreshedUser) return;
            updateAccess({
              role: refreshedUser.role?.toUpperCase() as 'ADMIN' | 'PASTOR' | 'LEADER' | 'CANTEEN' | 'MEMBER' | undefined,
              permissions: Array.isArray(refreshedUser.permissions) ? refreshedUser.permissions : undefined,
              planFeatures: Array.isArray(refreshedUser.planFeatures) ? refreshedUser.planFeatures : undefined,
              teamIds: Array.isArray(refreshedUser.teamIds) ? refreshedUser.teamIds : undefined,
            });
          });
          return;
        }
        if (data.type === 'provisioning.updated') {
          window.dispatchEvent(new CustomEvent('church:provisioning-updated', { detail: data }));
          return;
        }
        if (data.type === 'presence.snapshot' || data.type === 'presence.updated' || data.type === 'presence.removed') {
          window.dispatchEvent(new CustomEvent('church:presence-updated', { detail: data }));
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
        if (notification.sourceType === 'gameChallenge') {
          window.dispatchEvent(new CustomEvent('church:game-challenge-updated', { detail: notification }));
        }
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
      window.clearInterval(heartbeatTimer);
      navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage);
      window.removeEventListener('online', refresh);
      document.removeEventListener('visibilitychange', refresh);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isAuthenticated, refreshSession, updateAccess, user?.tenantId]);

  return null;
}
