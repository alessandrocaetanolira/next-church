import { apiRequest } from '@/services/api/client';

export type UserBranding = {
  name?: string | null;
  logoUrl?: string | null;
  themeVariant?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
};

export function getUserBranding() {
  return apiRequest<UserBranding>('/api/settings/branding', { cache: 'no-store' });
}

export function updateUserBranding(input: { name: string; logoBase64?: string; themeVariant: string }) {
  return apiRequest<UserBranding>('/api/settings/branding', { method: 'PATCH', body: JSON.stringify(input) });
}
