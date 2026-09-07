/**
 * features/canteen/components/PDV.tsx
 * 
 * Interface do Ponto de Venda (Fidelidade ao Mesa App).
 * Implementa Grid de Produtos, Carrinho Lateral (Desktop) e Drawer (Mobile).
 */

"use client";

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useProducts } from '../hooks/use-products';
import { useCartStore } from '../store/useCartStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShoppingCart, Plus, Minus, Trash2, Search, Package, Coffee, Pizza, IceCream, Sandwich, CreditCard, Banknote, Smartphone, User, ChefHat } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { db } from '@/lib/db';
import { toast } from 'sonner';
import { cn, formatCurrency } from '@/lib/utils';
import { generateId } from '@/lib/id';

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
}

const CartContent = ({ items, decrementItem, incrementItem, removeItem, total, getProductStock, onCheckout }: CartContentProps) => (
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
            <div className="flex justify-between items-center mb-4">
                <span className="text-muted-foreground">Total</span>
                <span className="text-xl font-bold text-primary">{formatCurrency(total)}</span>
            </div>
            <Button className="w-full h-12 text-lg" disabled={items.length === 0} onClick={onCheckout}>
                Finalizar Venda
            </Button>
        </div>
    </div>
);

export function PDV() {
  const products = useProducts();
  const { items, addItem, incrementItem, decrementItem, removeItem, clearCart, total } = useCartStore();
  const members = useLiveQuery(() => db.members.toArray()) || [];
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [search, setSearch] = useState('');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState('');
  const [sendToPrep, setSendToPrep] = useState(false);
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
    const product = products.find((entry) => entry.id === productId);
    const item = items.find((entry) => entry.productId === productId);
    if (!product || !item) return;

    if (item.quantity >= product.stock) {
      toast.error('Estoque insuficiente.');
      return;
    }

    incrementItem(productId);
  };

  const handleCheckout = async (paymentMethod: string) => {
    if (items.length === 0) return;
    if (paymentMethod.toLowerCase() === 'fiado' && !selectedMember) {
      toast.error('Selecione um membro para fiado.');
      return;
    }

    const saleId = generateId();
    const createdAt = new Date().toISOString();
    const member = members.find((item) => item.id === selectedMember);

    const payload = {
      id: saleId,
      total,
      paymentMethod: paymentMethod.toLowerCase(),
      items,
      memberId: paymentMethod.toLowerCase() === 'fiado' ? selectedMember : undefined,
      memberName: paymentMethod.toLowerCase() === 'fiado' ? member?.name : undefined,
      createdAt,
      createdBy: 'user',
    };

    try {
      const response = await fetch('/api/canteen/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        await db.sales.put({
          ...payload,
          orderStatus: sendToPrep ? 'preparing' : undefined,
          _status: 'synced',
        });
      } else {
        await db.sales.add({
          ...payload,
          orderStatus: sendToPrep ? 'preparing' : undefined,
          _status: 'pending',
        });
        await db.syncOutbox.add({
          module: 'sales',
          action: 'create',
          data: payload,
          timestamp: new Date().toISOString(),
        });
      }
    } catch {
      await db.sales.add({
        ...payload,
        orderStatus: sendToPrep ? 'preparing' : undefined,
        _status: 'pending',
      });
      await db.syncOutbox.add({
        module: 'sales',
        action: 'create',
        data: payload,
        timestamp: new Date().toISOString(),
      });
    }

    clearCart();
    setCheckoutOpen(false);
    setCartOpen(false);
    setSelectedMember('');
    setSendToPrep(false);
    toast.success("Venda registrada!");
  };

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

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
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
                                    <img
                                      src={product.imageUrl}
                                      alt={product.name}
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
            onCheckout={() => setCheckoutOpen(true)}
          />
        </div>
      </div>

      <div className="lg:hidden">
        {items.length > 0 && (
            <Drawer open={cartOpen} onOpenChange={setCartOpen}>
                <DrawerTrigger asChild>
                    <button className="fixed bottom-20 left-4 right-4 z-40 flex items-center justify-between rounded-xl bg-primary p-4 text-primary-foreground shadow-lg transition-transform active:scale-[0.98]">
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
                          onCheckout={() => setCheckoutOpen(true)}
                        />
                    </div>
                </DrawerContent>
            </Drawer>
        )}
      </div>

      {/* Checkout Dialog */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Forma de Pagamento</DialogTitle></DialogHeader>
            <div className="space-y-4">
                <div className="text-center py-2">
                  <p className="text-3xl font-bold text-primary">{formatCurrency(total)}</p>
                  <p className="text-sm text-muted-foreground mt-1">{cartCount} item(s)</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" className="h-20 flex flex-col gap-2" onClick={() => handleCheckout('cash')}>
                      <Banknote className="w-6 h-6 text-green-600" /><span>Dinheiro</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex flex-col gap-2" onClick={() => handleCheckout('pix')}>
                      <Smartphone className="w-6 h-6 text-primary" /><span>PIX</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex flex-col gap-2" onClick={() => handleCheckout('credit')}>
                      <CreditCard className="w-6 h-6 text-sky-600" /><span>Cartão</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex flex-col gap-2" onClick={() => handleCheckout('fiado')}>
                      <User className="w-6 h-6 text-amber-600" /><span>Fiado</span>
                    </Button>
                </div>
                <div className="space-y-2">
                  <Label>Membro (para fiado)</Label>
                  <Select value={selectedMember} onValueChange={setSelectedMember}>
                    <SelectTrigger><SelectValue placeholder="Selecione um membro" /></SelectTrigger>
                    <SelectContent>
                      {members.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between rounded-xl border bg-muted/20 p-3">
                  <div className="flex items-center gap-2">
                    <ChefHat className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Enviar para preparo</span>
                  </div>
                  <Button variant={sendToPrep ? 'default' : 'outline'} size="sm" onClick={() => setSendToPrep((value) => !value)}>
                    {sendToPrep ? 'Sim' : 'Não'}
                  </Button>
                </div>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
