'use client';

import { useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { getCartOwnerKey, useCartStore, type CartMode } from '../store/useCartStore';

/** Vincula o carrinho persistido à sessão atual antes de exibir seus itens. */
export function useCanteenCartOwner(mode: CartMode = 'sale', enabled = true) {
  const { user, isLoading } = useAuth();
  const selectOwner = useCartStore((state) => state.selectOwner);
  const isReady = useCartStore((state) => state.isReady);
  const activeOwnerKey = useCartStore((state) => state.activeOwnerKey);
  const identity = user?.id || user?.email;
  const expectedKey = user?.tenantId && identity ? getCartOwnerKey({ tenantId: user.tenantId, userId: identity, mode }) : null;

  useEffect(() => {
    if (isLoading || !enabled) return;
    selectOwner(user?.tenantId && (user.id || user.email)
      ? { tenantId: user.tenantId, userId: user.id || user.email, mode }
      : null);
  }, [isLoading, enabled, mode, selectOwner, user?.email, user?.id, user?.tenantId]);

  return enabled && isReady && !isLoading && expectedKey !== null && activeOwnerKey === expectedKey;
}
