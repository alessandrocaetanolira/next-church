import { apiRequest } from '@/services/api/client';

export type AdminPlan = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  priceCents: number;
  maxUsers: number | null;
  maxStorageMb: number | null;
  features: string | null;
  active: boolean;
  churches: number;
};

export function listAdminPlans() {
  return apiRequest<AdminPlan[]>('/api/admin/plans', { cache: 'no-store' });
}

export function createAdminPlan(input: unknown) {
  return apiRequest<AdminPlan>('/api/admin/plans', { method: 'POST', body: JSON.stringify(input) });
}

export function updateAdminPlan(id: string, input: unknown) {
  return apiRequest<AdminPlan>(`/api/admin/plans/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteAdminPlan(id: string) {
  return apiRequest<{ success: boolean }>(`/api/admin/plans/${id}`, { method: 'DELETE' });
}
