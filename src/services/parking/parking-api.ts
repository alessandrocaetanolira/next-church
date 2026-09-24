import { apiRequest } from '@/services/api/client';

export type ParkingGroup = { id: string; name: string };
export type ParkingMember = { id: string; name: string };
export type ParkingSpot = {
  id: string;
  groupId: string;
  label: string;
  status: string;
  occupiedByMemberId?: string | null;
  occupiedByName?: string | null;
  notes?: string | null;
  occupiedAt?: string | null;
};

export function listParkingGroups() {
  return apiRequest<ParkingGroup[]>('/api/groups?type=parking', { cache: 'no-store' });
}

export function listParkingMembers() {
  return apiRequest<ParkingMember[]>('/api/members', { cache: 'no-store' });
}

export function listParkingSpots(groupId: string) {
  return apiRequest<ParkingSpot[]>(`/api/parking/spots?groupId=${encodeURIComponent(groupId)}`, { cache: 'no-store' });
}

export function createParkingSpot(input: Record<string, unknown>) {
  return apiRequest<ParkingSpot>('/api/parking/spots', { method: 'POST', body: JSON.stringify(input) });
}

export function updateParkingSpot(id: string, input: Record<string, unknown>) {
  return apiRequest<ParkingSpot>(`/api/parking/spots/${id}`, { method: 'PUT', body: JSON.stringify(input) });
}

export function updateParkingSpotStatus(id: string, input: Record<string, unknown>) {
  return apiRequest<ParkingSpot>(`/api/parking/spots/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteParkingSpot(id: string) {
  return apiRequest<{ success: boolean }>(`/api/parking/spots/${id}`, { method: 'DELETE' });
}

export function notifyParkingResponsible(id: string, input: { title: string; message: string }) {
  return apiRequest<{ success: boolean }>(`/api/parking/spots/${id}/notify`, { method: 'POST', body: JSON.stringify(input) });
}

export function publishParkingFeed(input: Record<string, unknown>) {
  return apiRequest<{ success: boolean }>('/api/feed', { method: 'POST', body: JSON.stringify(input) });
}
