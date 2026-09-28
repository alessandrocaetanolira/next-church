'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { openNotificationStream } from '@/services/notification-stream';

/**
 * Hook para consumir eventos em tempo real do servidor.
 */
export const useSSE = () => {
  useEffect(() => {
    return openNotificationStream((data) => {
      if (data.type !== 'heartbeat') toast.info('Nova atualização recebida');
    });
  }, []);
};
