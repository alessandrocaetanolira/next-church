import { apiRequest } from '@/services/api/client';
import type { TenantUserUsage } from '@/lib/tenant-user-usage';

export type AdminTenant = {
  id: string;
  slug: string;
  name: string;
  plan: string;
  active: boolean;
  createdAt: string;
  databaseKey?: string | null;
  status?: string;
  userUsage?: TenantUserUsage | null;
};

export function listAdminTenants() {
  return apiRequest<AdminTenant[]>('/api/admin/tenants', { cache: 'no-store' });
}

export type ProvisioningStart = { runId: string; slug: string; status: string };

export function createAdminTenant(input: unknown) {
  return apiRequest<ProvisioningStart>('/api/admin/tenants', { method: 'POST', body: JSON.stringify(input) });
}

export function updateAdminTenantStatus(id: string, active: boolean) {
  return apiRequest<AdminTenant>(`/api/admin/tenants/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ active }),
  });
}

export function retryAdminTenantProvisioning(id: string, adminPassword: string) {
  return apiRequest<ProvisioningStart>(`/api/admin/tenants/${id}`, { method: 'POST', body: JSON.stringify({ adminPassword }) });
}

export function updateAdminTenant(id: string, input: { name?: string; slug?: string; active?: boolean; plan?: string }) {
  return apiRequest<AdminTenant>(`/api/admin/tenants/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function getAdminTenant<T = AdminTenant>(id: string) {
  return apiRequest<T>(`/api/admin/tenants/${id}`, { cache: 'no-store' });
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
