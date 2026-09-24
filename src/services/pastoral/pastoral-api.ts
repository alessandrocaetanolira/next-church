import { apiRequest } from '@/services/api/client';

export type CreatedAnnouncement = {
  id: string;
  reference?: string | null;
  content: string;
  userName?: string | null;
  createdAt: string;
};

export function createPastoralAnnouncement(input: unknown) {
  return apiRequest<CreatedAnnouncement>('/api/feed', { method: 'POST', body: JSON.stringify(input) });
}

export function deletePastoralAnnouncement(id: string) {
  return apiRequest<{ success: boolean }>(`/api/feed/${id}`, { method: 'DELETE' });
}

export function processPendingMember(memberId: string, action: 'approve' | 'reject') {
  return apiRequest<unknown>(`/api/pastoral/members/${memberId}`, { method: 'PATCH', body: JSON.stringify({ action }) });
}

export function processPastoralJoinRequest(requestId: string, action: 'approve' | 'reject') {
  return apiRequest<unknown>(`/api/teams/join-requests/${requestId}`, { method: 'PATCH', body: JSON.stringify({ action }) });
}
