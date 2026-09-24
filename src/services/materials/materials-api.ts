import { apiRequest } from '@/services/api/client';

export type Material = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  minQuantity: number;
  unit: string;
};

export function listMaterials() { return apiRequest<Material[]>('/api/materials'); }
export function updateMaterialQuantity(id: string, quantity: number) { return apiRequest<Material>(`/api/materials/${id}`, { method: 'PATCH', body: JSON.stringify({ quantity }) }); }
export function createMaterial(input: unknown) { return apiRequest<Material>('/api/materials', { method: 'POST', body: JSON.stringify(input) }); }
export function updateMaterial(id: string, input: unknown) { return apiRequest<Material>(`/api/materials/${id}`, { method: 'PUT', body: JSON.stringify(input) }); }
export function deleteMaterial(id: string) { return apiRequest<{ success: boolean }>(`/api/materials/${id}`, { method: 'DELETE' }); }
