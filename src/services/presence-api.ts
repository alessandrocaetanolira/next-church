import { apiClient } from '@/lib/api';

export type PresenceRecord = { userId: string; lastSeenAt: string };

export const presenceApi = {
  list: () => apiClient.get<{ presence: PresenceRecord[] }>('/api/presence'),
  heartbeat: () => apiClient.post<{ online: boolean; userId: string; lastSeenAt: string }>('/api/presence/heartbeat'),
};
