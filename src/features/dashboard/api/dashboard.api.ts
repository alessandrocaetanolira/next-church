import { apiClient } from '@/lib/api';

export type DashboardSummary = {
  tasks: {
    completedToday: number;
    pendingToday: number;
    upcoming: Array<{ id: string; title: string; date: string; status: string; type: string; teamId: string }>;
  } | null;
  canteen: { salesToday: number; lowStock: number } | null;
};

export const dashboardApi = {
  summary: () => apiClient.get<DashboardSummary>('/api/dashboard/summary', { cache: 'no-store' }),
};
