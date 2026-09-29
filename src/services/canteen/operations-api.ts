import { canteenOperationsApi } from '@/features/canteen/api/operations.api';

export function updateCanteenSale<T = Record<string, unknown>>(id: string, input: unknown) { return canteenOperationsApi.updateSale<T>(id, input); }
export function registerMemberPayment<T = Record<string, unknown>>(memberId: string, amount: number) { return canteenOperationsApi.registerMemberPayment<T>(memberId, amount); }
export function getMemberLedger<T = unknown>(memberId: string) { return canteenOperationsApi.memberLedger<T>(memberId); }
export type { CanteenStatus } from '@/features/canteen/api/operations.api';
export function getCanteenStatus() { return canteenOperationsApi.status(); }
export function setCanteenStatus(isOpen: boolean) { return canteenOperationsApi.setStatus(isOpen); }
