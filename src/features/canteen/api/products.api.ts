import { apiClient } from '@/lib/api';
import type { LocalProduct } from '@/lib/db';

export type ProductMutation = {
  id?: string;
  name: string;
  description?: string;
  imageUrl?: string | null;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  category: string;
  active: boolean;
  availableToday: boolean;
};

export const productsApi = {
  list: () => apiClient.get<LocalProduct[]>('/api/canteen/products'),
  create: (input: ProductMutation) => apiClient.post<LocalProduct>('/api/canteen/products', input),
  update: (id: string, input: ProductMutation) => apiClient.put<LocalProduct>(`/api/canteen/products/${id}`, input),
  remove: (id: string) => apiClient.delete<{ success: boolean }>(`/api/canteen/products/${id}`),
};
