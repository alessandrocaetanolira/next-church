'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';

/**
 * Hook para consumir eventos em tempo real do servidor.
 */
export const useSSE = () => {
  useEffect(() => {
    const eventSource = new EventSource('/api/events');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type !== 'heartbeat') {
          console.log('Evento SSE recebido:', data);
          toast.info('Nova atualização recebida');
        }
      } catch (e) {
        console.error('Erro ao processar evento SSE', e);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE Error:', err);
      eventSource.close();
    };

    return () => eventSource.close();
  }, []);
};
