'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { getCanteenAccess } from '@/lib/canteen/access';
import { useCartStore } from '../store/useCartStore';
import { salesApi } from '../api/sales.api';
import { isNetworkError } from '@/services/api/client';
import { db } from '@/lib/db';
import { generateId } from '@/lib/id';
import type { useCanteenStatus } from './use-canteen-status';

/** Pedido próprio reutiliza o carrinho visual, mas nunca os dados de comprador do checkout operacional. */
export function useSubmitPersonalOrder(operation: ReturnType<typeof useCanteenStatus>, cartReady: boolean) {
  const { user } = useAuth();
  const { canOrder } = getCanteenAccess(user);
  const busy = useRef(false);
  const [submitting, setSubmitting] = useState(false);

  const submitOrder = async () => {
    const snapshot = useCartStore.getState();
    if (!canOrder || !user?.linkedMemberId || !cartReady || !snapshot.items.length || busy.current) return false;
    busy.current = true; setSubmitting(true);
    const ownerKey = snapshot.activeOwnerKey;
    const payload = {
      id: generateId(), intent: 'purchase' as const, total: snapshot.total, items: snapshot.items,
      consumerType: 'MEMBER' as const, paymentMethod: 'pending' as const, orderStatus: 'pending' as const,
      memberId: user.linkedMemberId, memberName: user.name,
      createdBy: user.email ?? user.name ?? 'Membro', tenantId: user.tenantId, createdAt: new Date().toISOString(),
    };
    try {
      const status = await operation.refresh();
      if (!status) { toast.error('Não foi possível confirmar o status da cantina. Seu carrinho foi mantido.'); return false; }
      if (!status.isOpen) { toast.error('A cantina está fechada no momento. Seu carrinho foi mantido.'); return false; }
      if (useCartStore.getState().activeOwnerKey !== ownerKey || useCartStore.getState().items !== snapshot.items) {
        toast.error('Seu carrinho mudou. Confira os itens antes de enviar.'); return false;
      }
      await salesApi.create(payload);
      // O aceite do servidor não vira erro de envio se apenas o cache local falhar.
      try { await db.sales.put({ ...payload, _status: 'synced' }); } catch { /* O histórico será reconsultado. */ }
      const current = useCartStore.getState();
      if (current.activeOwnerKey === ownerKey && current.items === snapshot.items) current.clearCart();
      toast.success('Pedido enviado para a cantina.');
      return true;
    } catch (error) {
      toast.error(isNetworkError(error)
        ? 'Sem confirmação de envio. Seu carrinho foi mantido; verifique seus pedidos antes de tentar novamente.'
        : error instanceof Error ? error.message : 'Não foi possível enviar o pedido.');
      return false;
    } finally { busy.current = false; setSubmitting(false); }
  };

  return { submitOrder, submitting };
}
