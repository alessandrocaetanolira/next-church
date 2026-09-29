/**
 * features/canteen/hooks/useProducts.ts
 * 
 * Hook para buscar e gerenciar produtos da cantina.
 * Utiliza o Dexie.js para persistência local e offline-first.
 * 
 * @returns {Array} Lista de produtos do banco local.
 */

"use client";

import { useCallback, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type LocalProduct } from '@/lib/db';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { filterByTenant } from '@/lib/offline-tenant';
import { syncCanteenProductsFromServer } from '@/features/canteen/lib/sync-products';

export function useProducts(enabled = true) {
  const { user } = useAuth();
  const tenantId = user?.tenantId ?? '';
  const loadProducts = useCallback(async () => {
    if (!enabled || !tenantId || !navigator.onLine) return;
    try { await syncCanteenProductsFromServer(tenantId); } catch { /* mantém o cache local */ }
  }, [enabled, tenantId]);

  useEffect(() => {
    void loadProducts();
    window.addEventListener('online', loadProducts);
    return () => window.removeEventListener('online', loadProducts);
  }, [loadProducts]);

  const products = useLiveQuery(
    async () => {
      // Busca todos os produtos ativos do banco local (Dexie)
      if (!enabled || !tenantId) return [];
      return filterByTenant(await db.products.toArray(), tenantId)
        .filter((product) => product.deletedAt === null);
    },
    [enabled, tenantId]
  );

  return products || [];
}
