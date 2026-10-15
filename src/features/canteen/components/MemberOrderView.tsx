'use client';

import { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { useDrawer } from '@/components/providers/DrawerProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useProducts } from '@/features/canteen/hooks/use-products';
import { useCartStore } from '@/features/canteen/store/useCartStore';
import { salesApi } from '@/features/canteen/api/sales.api';
import { isNetworkError } from '@/services/api/client';
import { db } from '@/lib/db';
import { generateId } from '@/lib/id';
import { formatCurrency } from '@/lib/utils';
import { queueSaleCreate } from '@/features/canteen/lib/offline-sales';
import { useCanteenCartOwner } from '@/features/canteen/hooks/use-canteen-cart-owner';
import { ProductCard } from './ProductCard';
import { ProductPurchaseActions } from './ProductPurchaseActions';
import { ProductDetailsDrawer } from './ProductDetailsDrawer';

export function MemberOrderView() {
  const { user } = useAuth();
  const { openDrawer } = useDrawer();
  const products = useProducts();
  const { items, clearCart, total } = useCartStore();
  const cartReady = useCanteenCartOwner();
  const [submitting, setSubmitting] = useState(false);

  const submitOrder = async () => {
    if (!cartReady || !items.length || submitting) return;
    setSubmitting(true);
    const payload = {
      id: generateId(), total, items, consumerType: 'MEMBER' as const, paymentMethod: 'pending' as const, orderStatus: 'pending' as const,
      memberId: user?.linkedMemberId ?? undefined, memberName: user?.name ?? undefined,
      createdBy: user?.name ?? user?.email ?? 'Membro', tenantId: user?.tenantId, createdAt: new Date().toISOString(),
    };
    try {
      try {
        await salesApi.create(payload);
        await db.sales.put({ ...payload, _status: 'synced' });
      } catch (error) {
        if (!isNetworkError(error)) throw error;
        await queueSaleCreate(payload);
      }
      clearCart();
      toast.success('Pedido enviado para a cantina.');
    } catch {
      toast.error('Não foi possível enviar o pedido.');
    } finally {
      setSubmitting(false);
    }
  };

  const availableProducts = products.filter((product) => product.active !== false && product.availableToday !== false);
  return <div className="space-y-4">
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {availableProducts.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          quantity={items.find((item) => item.productId === product.id)?.quantity ?? 0}
          onViewDetails={() => openDrawer({ content: <ProductDetailsDrawer productId={product.id} />, repositionInputs: false })}
          actions={<ProductPurchaseActions product={product} cartReady={cartReady} />}
        />
      ))}
    </div>
    <Card><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2"><ShoppingCart className="h-5 w-5" /><span>{items.reduce((sum, item) => sum + item.quantity, 0)} item(ns)</span><strong>{formatCurrency(total)}</strong></div><Button disabled={!cartReady || !items.length || submitting} onClick={() => void submitOrder()}>{submitting ? 'Enviando...' : 'Enviar pedido'}</Button></CardContent></Card>
  </div>;
}
