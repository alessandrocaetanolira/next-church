import { apiRequest } from '@/services/api/client';

export type PublicChurchBranding = { name: string; pwaName?: string | null; logoUrl?: string | null; themeVariant?: string | null };

export function getPublicChurchBranding(slug: string) {
  return apiRequest<PublicChurchBranding>(`/api/public/church-branding?igreja=${encodeURIComponent(slug)}`, { cache: 'no-store' });
}

export function registerPublicMember(input: unknown) {
  return apiRequest<unknown>('/api/public/register', { method: 'POST', body: JSON.stringify(input) });
}
