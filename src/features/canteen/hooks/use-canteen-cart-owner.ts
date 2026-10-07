'use client';

import { useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCartStore } from '../store/useCartStore';

/** Vincula o carrinho persistido à sessão atual antes de exibir seus itens. */
export function useCanteenCartOwner() {
  const { user, isLoading } = useAuth();
  const selectOwner = useCartStore((state) => state.selectOwner);
  const isReady = useCartStore((state) => state.isReady);

  useEffect(() => {
    if (isLoading) return;
    selectOwner(user?.tenantId && (user.id || user.email)
      ? { tenantId: user.tenantId, userId: user.id || user.email }
      : null);
  }, [isLoading, selectOwner, user?.email, user?.id, user?.tenantId]);

  return isReady && !isLoading;
}
