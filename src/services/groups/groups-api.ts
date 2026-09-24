import { apiRequest } from '@/services/api/client';

export function listGroups<T = unknown[]>(type?: string) {
  const query = type ? `?type=${encodeURIComponent(type)}` : '';
  return apiRequest<T>(`/api/groups${query}`, { cache: 'no-store' });
}

export function listMembers<T = unknown[]>() {
  return apiRequest<T>('/api/members', { cache: 'no-store' });
}

export function listJoinRequests<T = unknown[]>() {
  return apiRequest<T>('/api/teams/join-requests', { cache: 'no-store' });
}

export function requestGroupJoin(teamId: string) {
  return apiRequest<unknown>('/api/teams/join-requests', { method: 'POST', body: JSON.stringify({ teamId }) });
}

export function createGroup(input: unknown) {
  return apiRequest<unknown>('/api/groups', { method: 'POST', body: JSON.stringify(input) });
}

export function getGroup<T = unknown>(groupId: string) {
  return apiRequest<T>(`/api/groups/${groupId}`, { cache: 'no-store' });
}

export function listGroupFeed<T = { items?: unknown[] }>(groupId: string) {
  return apiRequest<T>(`/api/feed?groupId=${encodeURIComponent(groupId)}`, { cache: 'no-store' });
}

export function listFundraising<T = unknown[]>(groupId: string) {
  return apiRequest<T>(`/api/groups/${groupId}/fundraising`, { cache: 'no-store' });
}

export function createFundraisingGoal(groupId: string, input: unknown) {
  return apiRequest<unknown>(`/api/groups/${groupId}/fundraising`, { method: 'POST', body: JSON.stringify(input) });
}

export function updateGroup(groupId: string, input: unknown) {
  return apiRequest<unknown>(`/api/groups/${groupId}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function processJoinRequest(requestId: string, action: 'approve' | 'reject') {
  return apiRequest<unknown>(`/api/teams/join-requests/${requestId}`, { method: 'PATCH', body: JSON.stringify({ action }) });
}

export function publishGroupPost(input: unknown) {
  return apiRequest<unknown>('/api/feed', { method: 'POST', body: JSON.stringify(input) });
}
