'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { db } from '@/lib/db';
import { belongsToTenant } from '@/lib/offline-tenant';

/** Lê o produto atual do cache, inclusive alterações recebidas com o drawer aberto. */
export function useProductDetails(productId: string) {
  const { user } = useAuth();
  const tenantId = user?.tenantId ?? '';
  const result = useLiveQuery(async () => {
    const product = tenantId ? await db.products.get(productId) : undefined;
    return { product: belongsToTenant(product, tenantId) && !product?.deletedAt ? product : undefined };
  }, [productId, tenantId]);

  return { product: result?.product, loading: result === undefined };
}
