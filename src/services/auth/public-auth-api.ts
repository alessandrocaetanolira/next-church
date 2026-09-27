import { apiRequest } from '@/services/api/client';

export type PublicChurchBranding = {
  slug?: string;
  name: string;
  pwaName?: string | null;
  pwaShortName?: string | null;
  logoUrl?: string | null;
  logoLightUrl?: string | null;
  logoDarkUrl?: string | null;
  mobileIconUrl?: string | null;
  icon192Url?: string | null;
  icon512Url?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  themeColor?: string | null;
  backgroundColor?: string | null;
  themeVariant?: string | null;
};

export function getPublicChurchBranding(slug: string) {
  return apiRequest<PublicChurchBranding>(`/api/public/church-branding?igreja=${encodeURIComponent(slug)}`, { cache: 'no-store' });
}

export function registerPublicMember(input: unknown) {
  return apiRequest<unknown>('/api/public/register', { method: 'POST', body: JSON.stringify(input) });
}
