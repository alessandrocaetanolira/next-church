'use client';

import { useCallback, useEffect, useState } from 'react';
import { dashboardApi, type DashboardSummary } from '../api/dashboard.api';

export function useDashboardSummary() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setSummary(await dashboardApi.summary());
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  return { summary, loading, refresh };
}
