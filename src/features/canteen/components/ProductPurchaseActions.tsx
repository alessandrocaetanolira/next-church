'use client';

import { Minus, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { LocalProduct } from '@/lib/db';
import { useCartStore } from '../store/useCartStore';

/** Controles reativos ao mesmo carrinho, tanto na lista quanto no drawer de detalhes. */
export function ProductPurchaseActions({ product, cartReady }: { product: LocalProduct; cartReady: boolean }) {
  const storedQuantity = useCartStore((state) => state.items.find((item) => item.productId === product.id)?.quantity ?? 0);
  const quantity = cartReady ? storedQuantity : 0;
  const decrementItem = useCartStore((state) => state.decrementItem);
  const unavailable = product.active === false || product.availableToday === false || product.stock <= 0;

  const addProduct = () => {
    if (!cartReady || unavailable) return;
    const cart = useCartStore.getState();
    const currentQuantity = cart.items.find((item) => item.productId === product.id)?.quantity ?? 0;
    if (currentQuantity >= product.stock) {
      toast.error('Estoque insuficiente.');
      return;
    }
    cart.addItem({ productId: product.id, name: product.name, price: product.price, quantity: 1 });
  };

  if (quantity > 0) {
    return (
      <div role="group" aria-label={`Quantidade de ${product.name}`} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1 rounded-lg bg-muted/50 p-1">
        <Button type="button" variant="ghost" size="icon" className="h-10 w-full min-w-0 max-w-10 justify-self-start" aria-label={`Diminuir quantidade de ${product.name}`} disabled={!cartReady} onClick={() => decrementItem(product.id)}><Minus aria-hidden="true" /></Button>
        <output aria-label={`Quantidade de ${product.name}`} aria-live="polite" className="min-w-5 text-center text-sm font-semibold tabular-nums">{quantity}</output>
        <Button type="button" variant="ghost" size="icon" className="h-10 w-full min-w-0 max-w-10 justify-self-end" aria-label={`Aumentar quantidade de ${product.name}`} disabled={!cartReady || unavailable || quantity >= product.stock} onClick={addProduct}><Plus aria-hidden="true" /></Button>
      </div>
    );
  }

  return (
    <Button type="button" className="h-11 w-full min-w-0 gap-1 px-2 text-xs sm:text-sm" aria-label={`Adicionar ${product.name} à sacola`} disabled={!cartReady || unavailable} onClick={addProduct}>
      <Plus aria-hidden="true" />{unavailable ? 'Indisponível' : 'Adicionar'}
    </Button>
  );
}
