import { apiClient } from '@/lib/api';

export const salesApi = {
  create: <T = unknown>(input: unknown) => apiClient.post<T>('/api/canteen/sales', input),
  update: <T = unknown>(id: string, input: unknown) => apiClient.patch<T>(`/api/canteen/sales/${id}`, input),
};
