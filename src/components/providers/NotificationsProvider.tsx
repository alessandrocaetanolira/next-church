'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { initializeNotificationCenter, upsertNotification } from '@/lib/notification-center';
import { openNotificationStream } from '@/services/notification-stream';

type NotificationEventPayload = {
  id: string;
  type: string;
  title: string;
  message: string;
  href?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
  createdAt: string;
};

export function NotificationsProvider() {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;

    void initializeNotificationCenter();

    const refresh = () => { void initializeNotificationCenter(true); };
    const close = openNotificationStream((data) => {
      try {
        const notification = data.notification as NotificationEventPayload | undefined;
        if (data.type !== 'notification' || !notification) return;

        const added = upsertNotification(notification);
        if (added) {
          toast.info(notification.title, {
            description: notification.message,
          });
        }
      } catch (error) {
        console.error('Erro ao processar SSE de notificações:', error);
      }
    });
    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', refresh);

    return () => {
      close();
      window.removeEventListener('online', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [isAuthenticated]);

  return null;
}
