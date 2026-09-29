import { apiClient } from '@/lib/api';
import type { ManagedMember } from '../components/member-display';

export type MemberMutation = {
  name: string;
  email: string;
  phone: string;
  parentPhone?: string;
  birthDate?: string;
  conversionDate?: string;
  baptismDate?: string;
  previousChurch?: string;
  aboutMe?: string;
  maritalStatus?: string;
  approved?: boolean;
};

export const membersApi = {
  list: () => apiClient.get<ManagedMember[]>('/api/members'),
  get: (id: string) => apiClient.get<ManagedMember>(`/api/members/${id}`),
  create: (input: MemberMutation) => apiClient.post<ManagedMember>('/api/members', input),
  update: (id: string, input: MemberMutation) => apiClient.put<ManagedMember>(`/api/members/${id}`, input),
  remove: (id: string) => apiClient.delete<{ success: boolean }>(`/api/members/${id}`),
  updateAccess: (id: string, input: { role: string; permissions: string[]; password?: string }) =>
    apiClient.patch<ManagedMember>(`/api/members/${id}/access`, input),
};
