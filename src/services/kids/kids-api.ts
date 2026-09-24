import { apiRequest } from '@/services/api/client';

export type KidsChild = {
  id: string;
  name: string;
  birthDate?: string | null;
  parentMemberIds: string[];
  allergies?: string | null;
  medications?: string | null;
  healthHistory?: string | null;
  dietaryRestrictions?: string | null;
  canDoPhysicalActivities?: boolean;
  notes?: string | null;
  groupIds: string[];
};

export type KidsMemberOption = { id: string; name: string };
export type KidsGroupOption = { id: string; name: string };

export function listKidsOptions() {
  return Promise.all([
    apiRequest<KidsChild[]>('/api/kids', { cache: 'no-store' }),
    apiRequest<KidsMemberOption[]>('/api/members', { cache: 'no-store' }),
    apiRequest<KidsGroupOption[]>('/api/groups?type=kids', { cache: 'no-store' }),
  ]);
}

export function createChild(input: unknown) {
  return apiRequest<KidsChild>('/api/kids', { method: 'POST', body: JSON.stringify(input) });
}

export function updateChild(id: string, input: unknown) {
  return apiRequest<KidsChild>(`/api/kids/${id}`, { method: 'PUT', body: JSON.stringify(input) });
}

export function deleteChild(id: string) {
  return apiRequest<{ success: boolean }>(`/api/kids/${id}`, { method: 'DELETE' });
}

export function notifyChildResponsibles(id: string, input: { title: string; message: string }) {
  return apiRequest<{ success: boolean }>(`/api/kids/${id}/notify`, { method: 'POST', body: JSON.stringify(input) });
}

export function publishKidsFeed(input: unknown) {
  return apiRequest<unknown>('/api/feed', { method: 'POST', body: JSON.stringify(input) });
}
