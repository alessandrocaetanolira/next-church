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

export function useProducts() {
  useEffect(() => {
    let active = true;

    const loadProducts = async () => {
      try {
        const response = await fetch('/api/canteen/products');
        if (!response.ok) return;

        const products = await response.json();
        if (!active || !Array.isArray(products)) return;

        await db.products.bulkPut(
          products.map((product) => ({
            ...product,
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
  }, []);

  const products = useLiveQuery(
    async () => {
      // Busca todos os produtos ativos do banco local (Dexie)
      return await db.products.filter(p => p.deletedAt === null).toArray();
    },
    []
  );

  return products || [];
}
