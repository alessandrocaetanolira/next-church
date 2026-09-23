import { apiRequest } from './client';

export const pushApi = {
  publicKey: () => apiRequest<{ publicKey: string }>('/api/push/vapid-public-key'),
  register: (subscription: PushSubscriptionJSON) => apiRequest<{ ok: true }>('/api/push/subscriptions', {
    method: 'POST',
    body: JSON.stringify(subscription),
  }),
  remove: (endpoint: string) => apiRequest<{ ok: true }>('/api/push/subscriptions', {
    method: 'DELETE',
    body: JSON.stringify({ endpoint }),
  }),
};
