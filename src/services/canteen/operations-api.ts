import { apiRequest } from '@/services/api/client';

export function updateCanteenSale<T = Record<string, unknown>>(id: string, input: unknown) { return apiRequest<T>(`/api/canteen/sales/${id}`, { method: 'PATCH', body: JSON.stringify(input) }); }
export function registerMemberPayment<T = Record<string, unknown>>(memberId: string, amount: number) { return apiRequest<T>(`/api/canteen/members/${memberId}/payments`, { method: 'POST', body: JSON.stringify({ amount }) }); }
export function getMemberLedger<T = unknown>(memberId: string) { return apiRequest<T>(`/api/canteen/members/${memberId}/ledger`, { cache: 'no-store' }); }
export type CanteenStatus = { isOpen: boolean; openedAt: string | null };
export function getCanteenStatus() { return apiRequest<CanteenStatus>('/api/canteen/status', { cache: 'no-store' }); }
export function setCanteenStatus(isOpen: boolean) { return apiRequest<CanteenStatus>('/api/canteen/status', { method: 'PATCH', body: JSON.stringify({ isOpen }) }); }
