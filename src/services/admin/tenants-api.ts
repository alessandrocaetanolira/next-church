import { apiRequest } from '@/services/api/client';

export type AdminTenant = {
  id: string;
  slug: string;
  name: string;
  plan: string;
  active: boolean;
  createdAt: string;
  databaseKey?: string | null;
  status?: string;
  _count?: { users: number };
};

export function listAdminTenants() {
  return apiRequest<AdminTenant[]>('/api/admin/tenants');
}

export function createAdminTenant(input: unknown) {
  return apiRequest<AdminTenant>('/api/admin/tenants', { method: 'POST', body: JSON.stringify(input) });
}

export function updateAdminTenantStatus(id: string, active: boolean) {
  return apiRequest<AdminTenant>(`/api/admin/tenants/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ active }),
  });
}

export function getAdminTenant<T = AdminTenant>(id: string) {
  return apiRequest<T>(`/api/admin/tenants/${id}`);
}

export function getAdminTenantBranding<T = Record<string, unknown>>(id: string) {
  return apiRequest<T>(`/api/admin/tenants/${id}/branding`);
}

export function updateAdminTenantBranding<T = Record<string, unknown>>(id: string, input: unknown) {
  return apiRequest<T>(`/api/admin/tenants/${id}/branding`, { method: 'PATCH', body: JSON.stringify(input) });
}

export type PlatformOverview = {
  total: number;
  active: number;
  inactive: number;
  provisioning: number;
  failed: number;
  archived: number;
};

export function getPlatformOverview() {
  return apiRequest<PlatformOverview>('/api/admin/overview', { cache: 'no-store' });
}
