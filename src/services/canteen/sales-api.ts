import { apiRequest } from '@/services/api/client';

export function createCanteenSale<T = Record<string, unknown>>(input: unknown) {
  return apiRequest<T>('/api/canteen/sales', { method: 'POST', body: JSON.stringify(input) });
}
