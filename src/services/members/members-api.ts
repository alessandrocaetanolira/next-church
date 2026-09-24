import { apiRequest } from '@/services/api/client';

export function listMembers<T = unknown[]>() {
  return apiRequest<T>('/api/members', { cache: 'no-store' });
}

export function getMember<T = unknown>(id: string) {
  return apiRequest<T>(`/api/members/${id}`);
}

export function createMember(input: unknown) {
  return apiRequest<unknown>('/api/members', { method: 'POST', body: JSON.stringify(input) });
}

export function updateMember(id: string, input: unknown) {
  return apiRequest<unknown>(`/api/members/${id}`, { method: 'PUT', body: JSON.stringify(input) });
}

export function deleteMember(id: string) {
  return apiRequest<{ success: boolean }>(`/api/members/${id}`, { method: 'DELETE' });
}

export function updateMemberAccess(id: string, input: unknown) {
  return apiRequest<unknown>(`/api/members/${id}/access`, { method: 'PATCH', body: JSON.stringify(input) });
}
