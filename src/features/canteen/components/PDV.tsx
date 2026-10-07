/**
 * features/canteen/components/PDV.tsx
 * 
 * Interface do Ponto de Venda (Fidelidade ao Mesa App).
 * Implementa Grid de Produtos, Carrinho Lateral (Desktop) e Drawer (Mobile).
 */

"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProducts } from '../hooks/use-products';
import { useCartStore } from '../store/useCartStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ShoppingCart, Plus, Minus, Trash2, Search, Package, Coffee, Pizza, IceCream, Sandwich, Store } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { AppImage } from '@/components/shared';
import { toast } from 'sonner';
import { cn, formatCurrency } from '@/lib/utils';
import { HorizontalScroll } from '@/components/common';
import { useCanteenStatus } from '../hooks/use-canteen-status';
import { useCanteenCartOwner } from '../hooks/use-canteen-cart-owner';

// Mapeamento de Ícones por Categoria
const CATEGORY_ICONS: Record<string, any> = {
    'Bebidas': Coffee,
    'Salgados': Pizza,
    'Doces': IceCream,
    'Lanches': Sandwich,
    'Outros': Package
};

interface CartContentProps {
    items: any[];
    decrementItem: (productId: string) => void;
    incrementItem: (productId: string) => void;
    removeItem: (id: string) => void;
    total: number;
    getProductStock: (productId: string) => number;
    onCheckout: () => void;
    canCheckout: boolean;
    checkoutMessage: string | null;
}

const CartContent = ({ items, decrementItem, incrementItem, removeItem, total, getProductStock, onCheckout, canCheckout, checkoutMessage }: CartContentProps) => (
    <div className="flex flex-col h-full">
        <div className="flex-1 overflow-auto p-4 space-y-3">
            {items.length === 0 ? (
                <div className="text-center text-muted-foreground py-10">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>Carrinho vazio</p>
                </div>
            ) : (
                items.map(item => (
                    <div key={item.productId} className="flex items-center gap-3 bg-muted/30 rounded-lg p-3 border border-border">
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{formatCurrency(item.price)}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => decrementItem(item.productId)}>
                                <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6"
                                disabled={item.quantity >= getProductStock(item.productId)}
                                onClick={() => incrementItem(item.productId)}
                            >
                                <Plus className="w-3 h-3" />
                            </Button>
                        </div>
                        <div className="text-right w-16">
                            <p className="font-bold text-sm">{formatCurrency(item.price * item.quantity)}</p>
                            <button onClick={() => removeItem(item.productId)} className="text-destructive text-[10px] hover:underline">
                                Remover
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
        <div className="p-4 border-t border-border bg-card">
            {checkoutMessage ? <div className="mb-3 flex items-start gap-2 rounded-lg bg-warning/10 p-3 text-xs text-warning-foreground">
                <Store className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <span>{checkoutMessage}</span>
            </div> : null}
            <div className="flex justify-between items-center mb-4">
                <span className="text-muted-foreground">Total</span>
                <span className="text-xl font-bold text-primary">{formatCurrency(total)}</span>
            </div>
            <Button className="w-full h-12 text-lg" disabled={items.length === 0 || !canCheckout} onClick={onCheckout}>
                Finalizar Venda
            </Button>
        </div>
    </div>
);

export function PDV() {
  const router = useRouter();
  const products = useProducts();
  const { items, addItem, incrementItem, decrementItem, removeItem, clearCart, total } = useCartStore();
  const cartReady = useCanteenCartOwner();
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [search, setSearch] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const { status: canteenStatus, loading: loadingCanteenStatus } = useCanteenStatus();
  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const categories = ['Todos', ...Array.from(new Set(products.map(p => p.category)))];
  
  const filteredProducts = products.filter(p => {
    const matchesCategory = activeCategory === 'Todos' || p.category === activeCategory;
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const isAvailableToday = p.active !== false && p.availableToday !== false;
    return matchesCategory && matchesSearch && isAvailableToday;
  });

  const getProductStock = (productId: string) =>
    products.find((product) => product.id === productId)?.stock ?? 0;

  const handleAddToCart = (productId: string) => {
    if (!cartReady) return;
    const product = products.find((entry) => entry.id === productId);
    if (!product) return;

    const currentQuantity = items.find((item) => item.productId === productId)?.quantity ?? 0;
    if (product.stock <= 0) {
      toast.error('Sem estoque.');
      return;
    }

    if (currentQuantity >= product.stock) {
      toast.error('Estoque insuficiente.');
      return;
    }

    addItem({ productId: product.id, name: product.name, price: product.price, quantity: 1 });
  };

  const handleIncrementItem = (productId: string) => {
    if (!cartReady) return;
    const product = products.find((entry) => entry.id === productId);
    const item = items.find((entry) => entry.productId === productId);
    if (!product || !item) return;

    if (item.quantity >= product.stock) {
      toast.error('Estoque insuficiente.');
      return;
    }

    incrementItem(productId);
  };

  const openCheckout = () => {
    if (!cartReady) return;
    if (items.length === 0) return;
    if (!canteenStatus.isOpen) {
      toast.error(loadingCanteenStatus ? 'Confirmando o status da cantina…' : 'A cantina está fechada no momento.');
      return;
    }
    setCartOpen(false);
    router.push('/cantina/checkout');
  };
  const canCheckout = canteenStatus.isOpen && !loadingCanteenStatus;
  const checkoutMessage = loadingCanteenStatus
    ? 'Confirmando se a cantina está aberta…'
    : canteenStatus.isOpen ? null : 'A cantina está fechada. Abra a operação para finalizar vendas.';

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar produto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <HorizontalScroll className="-mx-1 px-1 pb-1" ariaLabel="Categorias de produtos">
        <div className="flex w-max gap-2">
        {categories.map((cat) => (
          <Button
            key={cat}
            variant={activeCategory === cat ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveCategory(cat)}
            className="whitespace-nowrap shrink-0"
          >
            {cat}
          </Button>
        ))}
        </div>
      </HorizontalScroll>

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex-1">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {filteredProducts.map((product) => {
                    const inCart = items.find(i => i.productId === product.id);
                    return (
                        <button
                            key={product.id} 
                            type="button"
                            disabled={product.stock <= 0}
                            onClick={() => handleAddToCart(product.id)}
                            className={cn(
                                "relative rounded-xl border bg-card p-3 text-left transition-all hover:shadow-sm",
                                inCart ? "border-primary/50 bg-primary/5" : "border-border hover:border-primary/30",
                                product.stock <= 0 && "cursor-not-allowed opacity-40"
                            )}
                        >
                            {inCart && (
                                <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                                    {inCart.quantity}
                                </span>
                            )}
                            {product.imageUrl ? (
                                <div className="mb-3 overflow-hidden rounded-lg border border-border bg-muted/20">
                                  <div className="aspect-[4/3] w-full">
                                    <AppImage
                                      src={product.imageUrl}
                                      alt={product.name}
                                      width={640}
                                      height={480}
                                      className="h-full w-full object-cover"
                                    />
                                  </div>
                                </div>
                            ) : null}
                            <h3 className="mb-1 line-clamp-2 text-sm font-medium">{product.name}</h3>
                            <p className="mb-2 text-xs text-muted-foreground">{product.category}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-primary">{formatCurrency(product.price)}</span>
                              <span
                                className={cn(
                                  "text-xs",
                                  (product.minStock ?? 0) > 0 && product.stock <= (product.minStock ?? 0)
                                    ? "text-destructive"
                                    : "text-muted-foreground"
                                )}
                              >
                                {product.stock}
                              </span>
                            </div>
                            {product.imageUrl ? (
                              <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                                {product.description || 'Sem descrição'}
                              </p>
                            ) : null}
                        </button>
                    )
                })}
            </div>
            {filteredProducts.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-2 opacity-40" />
                    <p>Nenhum produto encontrado</p>
                </div>
            )}
        </div>

        <div className="hidden w-80 shrink-0 flex-col rounded-xl border border-border bg-card lg:flex lg:max-h-[calc(100vh-16rem)]">
          <div className="border-b border-border p-4">
              <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-primary" />
                      <span className="text-sm font-semibold">Carrinho</span>
                      {cartCount > 0 ? <Badge variant="secondary" className="text-xs">{cartCount}</Badge> : null}
                  </div>
                  {items.length > 0 ? (
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={clearCart}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  ) : null}
              </div>
          </div>
          <CartContent
            items={items}
            decrementItem={decrementItem}
            incrementItem={handleIncrementItem}
            removeItem={removeItem}
            total={total}
            getProductStock={getProductStock}
            onCheckout={openCheckout}
            canCheckout={canCheckout}
            checkoutMessage={checkoutMessage}
          />
        </div>
      </div>

      <div className="lg:hidden">
        {items.length > 0 && (
            <Drawer open={cartOpen} onOpenChange={setCartOpen}>
                <DrawerTrigger asChild>
                    <button className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-4 right-4 z-[55] flex items-center justify-between rounded-xl bg-primary p-4 text-primary-foreground shadow-lg transition-transform active:scale-[0.98]">
                        <div className="flex items-center gap-3">
                            <ShoppingCart className="w-5 h-5" />
                            <span className="font-semibold">{cartCount} item(s)</span>
                        </div>
                        <span className="font-bold text-lg">{formatCurrency(total)}</span>
                    </button>
                </DrawerTrigger>
                <DrawerContent className="max-h-[85vh]">
                    <DrawerHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <DrawerTitle>Carrinho</DrawerTitle>
                          <Button variant="ghost" size="sm" onClick={clearCart}>
                            <Trash2 className="w-4 h-4 mr-1" /> Limpar
                          </Button>
                        </div>
                    </DrawerHeader>
                    <div className="flex flex-col" style={{ maxHeight: 'calc(85vh - 80px)' }}>
                        <CartContent
                          items={items}
                          decrementItem={decrementItem}
                          incrementItem={handleIncrementItem}
                          removeItem={removeItem}
                          total={total}
                          getProductStock={getProductStock}
                          onCheckout={openCheckout}
                          canCheckout={canCheckout}
                          checkoutMessage={checkoutMessage}
                        />
                    </div>
                </DrawerContent>
            </Drawer>
        )}
      </div>

    </div>
  );
}
