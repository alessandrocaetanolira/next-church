import { apiRequest } from '@/services/api/client';

export type UserBranding = {
  name?: string | null;
  pwaName?: string | null;
  pwaShortName?: string | null;
  logoUrl?: string | null;
  logoLightUrl?: string | null;
  logoDarkUrl?: string | null;
  mobileIconUrl?: string | null;
  sidebarLogoUrl?: string | null;
  sidebarOpenLightUrl?: string | null;
  sidebarOpenDarkUrl?: string | null;
  sidebarCollapsedLightUrl?: string | null;
  sidebarCollapsedDarkUrl?: string | null;
  sidebarUseImage?: boolean;
  sidebarTitle?: string | null;
  sidebarSubtitle?: string | null;
  themeVariant?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
};

export function getUserBranding() {
  return apiRequest<UserBranding>('/api/settings/branding', { cache: 'no-store' });
}

export function updateUserBranding(input: Record<string, unknown>) {
  return apiRequest<UserBranding>('/api/settings/branding', { method: 'PATCH', body: JSON.stringify(input) });
}
