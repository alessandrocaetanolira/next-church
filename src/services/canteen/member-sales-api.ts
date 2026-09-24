import { apiRequest } from '@/services/api/client';

export function createMemberSale(input: unknown) {
  return apiRequest<unknown>('/api/canteen/sales', { method: 'POST', body: JSON.stringify(input) });
}
