import { apiRequest } from './client';

export const pushApi = {
  publicKey: (signal?: AbortSignal) => apiRequest<{ publicKey: string }>('/api/push/vapid-public-key', { signal }),
  register: (subscription: PushSubscriptionJSON, signal?: AbortSignal) => apiRequest<{ ok: true }>('/api/push/subscriptions', {
    signal,
    method: 'POST',
    body: JSON.stringify(subscription),
  }),
  remove: (endpoint: string, signal?: AbortSignal) => apiRequest<{ ok: true }>('/api/push/subscriptions', {
    signal,
    method: 'DELETE',
    body: JSON.stringify({ endpoint }),
  }),
};
