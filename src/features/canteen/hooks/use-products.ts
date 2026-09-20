/**
 * features/canteen/hooks/useProducts.ts
 * 
 * Hook para buscar e gerenciar produtos da cantina.
 * Utiliza o Dexie.js para persistência local e offline-first.
 * 
 * @returns {Array} Lista de produtos do banco local.
 */

"use client";

import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useAuth } from '@/features/auth/hooks/useAuth';

export function useProducts(enabled = true) {
  const { user } = useAuth();
  const tenantId = user?.tenantId ?? '';
  useEffect(() => {
    let active = true;

    const loadProducts = async () => {
      if (!enabled) return;
      try {
        const response = await fetch('/api/canteen/products');
        if (!response.ok) return;

        const products = await response.json();
        if (!active || !Array.isArray(products)) return;

        await db.products.bulkPut(
          products.map((product) => ({
            ...product,
            tenantId,
            active: product.active ?? true,
            availableToday: product.availableToday ?? true,
            deletedAt: product.deletedAt ?? null,
            _status: 'synced' as const,
          }))
        );
      } catch {
        // Mantém a leitura local caso a rede falhe.
      }
    };

    loadProducts();

    return () => {
      active = false;
    };
  }, [enabled, tenantId]);

  const products = useLiveQuery(
    async () => {
      // Busca todos os produtos ativos do banco local (Dexie)
      if (!enabled || !tenantId) return [];
      return await db.products
        .filter((product) => product.tenantId === tenantId && product.deletedAt === null)
        .toArray();
    },
    [enabled, tenantId]
  );

  return products || [];
}
