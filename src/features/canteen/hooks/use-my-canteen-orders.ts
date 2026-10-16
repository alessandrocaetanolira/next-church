'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useNotificationCenter } from '@/hooks/use-notification-center';
import { syncMemberSalesFromServer } from '../lib/sync-member-sales';
import type { LocalSale } from '@/lib/db';

/** Atualiza somente pedidos próprios pelo stream existente e no retorno à rede. */
export function useMyCanteenOrders() {
  const { user } = useAuth();
  const tenantId = user?.tenantId;
  const memberId = user?.linkedMemberId;
  const userId = user?.id;
  const { notifications } = useNotificationCenter();
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ scope: string; sales: LocalSale[]; error: boolean }>();
  const scope = JSON.stringify([tenantId, userId, memberId]);
  // Reuse the existing notification stream rather than opening another SSE connection.
  const orderRevision = notifications.filter((item) => item.type.startsWith('canteen-order-')).map((item) => item.id).join('|');

  useEffect(() => {
    if (!tenantId || !memberId || !userId) return;
    let active = true;
    void syncMemberSalesFromServer(tenantId).then((payload) => {
      if (active) setResult({ scope, sales: payload.sales.filter((sale) => sale.memberId === memberId), error: false });
    }).catch(() => {
      if (active) setResult({ scope, sales: [], error: true });
    });
    return () => { active = false; };
  }, [tenantId, memberId, userId, scope, revision, orderRevision]);

  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    return () => { window.removeEventListener('focus', refresh); window.removeEventListener('online', refresh); };
  }, []);

  const current = result?.scope === scope ? result : undefined;
  return { memberId, current, refresh: () => setRevision((value) => value + 1) };
}
