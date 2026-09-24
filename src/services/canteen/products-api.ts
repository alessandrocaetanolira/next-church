import { apiRequest } from '@/services/api/client';

export function listCanteenProducts<T = unknown[]>() {
  return apiRequest<T>('/api/canteen/products');
}

export function createCanteenProduct<T = Record<string, unknown>>(input: unknown) {
  return apiRequest<T>('/api/canteen/products', { method: 'POST', body: JSON.stringify(input) });
}

export function updateCanteenProduct<T = Record<string, unknown>>(id: string, input: unknown) {
  return apiRequest<T>(`/api/canteen/products/${id}`, { method: 'PUT', body: JSON.stringify(input) });
}

export function deleteCanteenProduct(id: string) {
  return apiRequest<{ success: boolean }>(`/api/canteen/products/${id}`, { method: 'DELETE' });
}
