import { salesApi } from '@/features/canteen/api/sales.api';

export function createCanteenSale<T = Record<string, unknown>>(input: unknown) {
  return salesApi.create<T>(input);
}
