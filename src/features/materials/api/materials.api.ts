import { apiClient } from '@/lib/api';

export type Material = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  minQuantity: number;
  unit: string;
};

export type MaterialMutation = Omit<Material, 'id'>;

export const materialsApi = {
  list: () => apiClient.get<Material[]>('/api/materials'),
  create: (input: MaterialMutation) => apiClient.post<Material>('/api/materials', input),
  update: (id: string, input: MaterialMutation) => apiClient.put<Material>(`/api/materials/${id}`, input),
  updateQuantity: (id: string, quantity: number) => apiClient.patch<Material>(`/api/materials/${id}`, { quantity }),
  remove: (id: string) => apiClient.delete<{ success: boolean }>(`/api/materials/${id}`),
};
