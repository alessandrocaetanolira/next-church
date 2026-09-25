'use client';

import { useState } from 'react';
import { Minus, Plus, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useProducts } from '@/features/canteen/hooks/use-products';
import { useCartStore } from '@/features/canteen/store/useCartStore';
import { createCanteenSale } from '@/services/canteen/sales-api';
import { db } from '@/lib/db';
import { generateId } from '@/lib/id';
import { formatCurrency } from '@/lib/utils';

export function MemberOrderView() {
  const { user } = useAuth();
  const products = useProducts();
  const { items, addItem, incrementItem, decrementItem, clearCart, total } = useCartStore();
  const [submitting, setSubmitting] = useState(false);

  const submitOrder = async () => {
    if (!items.length || submitting) return;
    setSubmitting(true);
    const payload = {
      id: generateId(), total, items, paymentMethod: 'pending' as const, orderStatus: 'pending' as const,
      memberId: user?.linkedMemberId ?? undefined, memberName: user?.name ?? undefined,
      createdBy: user?.name ?? user?.email ?? 'Membro', createdAt: new Date().toISOString(),
    };
    try {
      try {
        await createCanteenSale(payload);
        await db.sales.put({ ...payload, _status: 'synced' });
      } catch {
        await db.sales.put({ ...payload, _status: 'pending' });
        await db.syncOutbox.add({ module: 'sales', action: 'create', data: payload, timestamp: new Date().toISOString() });
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
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {availableProducts.map((product) => {
        const item = items.find((entry) => entry.productId === product.id);
        return <Card key={product.id}><CardContent className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-2"><h3 className="font-semibold">{product.name}</h3><Badge variant="outline">{product.category}</Badge></div>
          <p className="text-sm text-muted-foreground">{product.description || 'Produto da cantina'}</p>
          <div className="flex items-center justify-between"><span className="font-bold text-primary">{formatCurrency(product.price)}</span>
            {item ? <div className="flex items-center gap-2"><Button size="icon" variant="outline" onClick={() => decrementItem(product.id)}><Minus className="h-4 w-4" /></Button><span>{item.quantity}</span><Button size="icon" variant="outline" disabled={item.quantity >= product.stock} onClick={() => incrementItem(product.id)}><Plus className="h-4 w-4" /></Button></div> : <Button size="sm" disabled={product.stock <= 0} onClick={() => addItem({ productId: product.id, name: product.name, price: product.price, quantity: 1 })}><Plus className="mr-1 h-4 w-4" />Adicionar</Button>}
          </div>
        </CardContent></Card>;
      })}
    </div>
    <Card><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2"><ShoppingCart className="h-5 w-5" /><span>{items.reduce((sum, item) => sum + item.quantity, 0)} item(ns)</span><strong>{formatCurrency(total)}</strong></div><Button disabled={!items.length || submitting} onClick={() => void submitOrder()}>{submitting ? 'Enviando...' : 'Enviar pedido'}</Button></CardContent></Card>
  </div>;
}
