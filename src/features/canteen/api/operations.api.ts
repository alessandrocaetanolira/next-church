import { apiClient } from '@/lib/api';

export type CanteenStatus = { isOpen: boolean; openedAt: string | null };
export const canteenOperationsApi = {
  updateSale: <T = unknown>(id: string, input: unknown) => apiClient.patch<T>(`/api/canteen/sales/${id}`, input),
  registerMemberPayment: <T = unknown>(memberId: string, amount: number) => apiClient.post<T>(`/api/canteen/members/${memberId}/payments`, { amount }),
  memberLedger: <T = unknown>(memberId: string) => apiClient.get<T>(`/api/canteen/members/${memberId}/ledger`, { cache: 'no-store' }),
  status: () => apiClient.get<CanteenStatus>('/api/canteen/status', { cache: 'no-store' }),
  setStatus: (isOpen: boolean) => apiClient.patch<CanteenStatus>('/api/canteen/status', { isOpen }),
};
