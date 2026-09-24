import { apiRequest } from '@/services/api/client';

export function getMemberFinancials<T = unknown>() {
  return apiRequest<T>('/api/members/me/financials', { cache: 'no-store' });
}
