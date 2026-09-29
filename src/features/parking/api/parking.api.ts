import { apiClient } from '@/lib/api';

export type ParkingGroup = { id: string; name: string };
export type ParkingMember = { id: string; name: string };
export type ParkingSpot = {
  id: string; groupId: string; label: string; status: string;
  occupiedByMemberId?: string | null; occupiedByName?: string | null;
  notes?: string | null; occupiedAt?: string | null;
};

export const parkingApi = {
  groups: () => apiClient.get<ParkingGroup[]>('/api/groups?type=parking', { cache: 'no-store' }),
  members: () => apiClient.get<ParkingMember[]>('/api/members', { cache: 'no-store' }),
  spots: (groupId: string) => apiClient.get<ParkingSpot[]>(`/api/parking/spots?groupId=${encodeURIComponent(groupId)}`, { cache: 'no-store' }),
  create: (input: ParkingMutation) => apiClient.post<ParkingSpot>('/api/parking/spots', input),
  update: (id: string, input: ParkingMutation) => apiClient.put<ParkingSpot>(`/api/parking/spots/${id}`, input),
  updateStatus: (id: string, input: Partial<ParkingMutation>) => apiClient.patch<ParkingSpot>(`/api/parking/spots/${id}`, input),
  remove: (id: string) => apiClient.delete<{ success: boolean }>(`/api/parking/spots/${id}`),
  notify: (id: string, input: { title: string; message: string }) => apiClient.post<{ success: boolean }>(`/api/parking/spots/${id}/notify`, input),
  publish: (input: Record<string, unknown>) => apiClient.post<{ success: boolean }>('/api/feed', input),
};

export type ParkingMutation = {
  groupId: string; label: string; status: string;
  occupiedByMemberId?: string | null; occupiedByName?: string | null;
  notes?: string | null; occupiedAt?: string | null;
};
