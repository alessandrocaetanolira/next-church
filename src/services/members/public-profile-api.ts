import { apiRequest } from '@/services/api/client';

export type PublicMemberProfile = {
  id: string; name: string; aboutMe?: string | null; phone?: string | null;
  maritalStatus?: string | null; avatarUrl?: string | null; coverUrl?: string | null; role?: string | null;
};

export function getPublicMemberProfile(id: string) {
  return apiRequest<PublicMemberProfile>(`/api/profile/members/${encodeURIComponent(id)}`, { cache: 'no-store' });
}
