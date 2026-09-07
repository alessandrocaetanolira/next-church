'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { initializeNotificationCenter, upsertNotification } from '@/lib/notification-center';

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

    const eventSource = new EventSource('/api/events');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as { type: string; notification?: NotificationEventPayload };
        if (data.type !== 'notification' || !data.notification) return;

        const added = upsertNotification(data.notification);
        if (added) {
          toast.info(data.notification.title, {
            description: data.notification.message,
          });
        }
      } catch (error) {
        console.error('Erro ao processar SSE de notificações:', error);
      }
    };

    eventSource.onerror = () => {
      // O EventSource já tenta reconectar sozinho.
    };

    return () => eventSource.close();
  }, [isAuthenticated]);

  return null;
}
