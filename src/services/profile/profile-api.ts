import { apiRequest } from '@/services/api/client';

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  role: string;
  linkedMemberId?: string | null;
  phone: string;
  birthDate?: string | null;
  aboutMe: string;
  maritalStatus: string;
};

export function getProfile() {
  return apiRequest<UserProfile>('/api/profile', { cache: 'no-store' });
}

export function updateProfile(input: Partial<UserProfile>) {
  return apiRequest<UserProfile>('/api/profile', { method: 'PATCH', body: JSON.stringify(input) });
}

export function uploadProfileAvatar(dataUrl: string) {
  return apiRequest<{ url: string }>('/api/files/upload', {
    method: 'POST',
    body: JSON.stringify({ module: 'profile', dataUrl }),
  });
}
