import { salesApi } from '@/features/canteen/api/sales.api';

export function createMemberSale(input: unknown) {
  return salesApi.create(input);
}
