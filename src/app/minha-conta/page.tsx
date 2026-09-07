'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useUIStore } from '@/features/ui/store';
import { useProducts } from '@/features/canteen/hooks/use-products';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { db, type LocalProduct, type LocalSale, type CartItem } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Wallet, ShoppingBag, Receipt, MessageCircle, QrCode, Plus, Minus, 
  ShoppingCart, AlertCircle, Gift, ArrowLeft, Package
} from 'lucide-react';
import { 
  getLoyaltyConfig, getLoyaltyProgress, isLoyaltyActive, 
  formatLoyaltyValidity, PAYMENT_METHOD_LABELS 
} from '@/lib/loyalty';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useRouter, useSearchParams } from 'next/navigation';
import { useNotificationCenter } from '@/hooks/use-notification-center';
import { syncMemberSalesFromServer } from '@/features/canteen/lib/sync-member-sales';
import { generateId } from '@/lib/id';

type FinancialMember = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  creditBalance?: number;
};

const TRANSACTIONS_PAGE_SIZE = 12;

function getMonthLabel(value: string) {
  return format(new Date(value), "MMMM 'de' yyyy", { locale: ptBR });
}

export default function MyAccountPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const user = session?.user;
  const { notifications } = useNotificationCenter();
  const setPageTitle = useUIStore((state) => state.setPageTitle);
  
  const requestedView = searchParams.get('view') === 'order' ? 'order' : 'profile';
  const [view, setView] = useState<'profile' | 'order'>(requestedView);
  const [cart, setCart] = useState<any[]>([]); // Using any for cart items structure flexibility
  const [cartOpen, setCartOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const [financialMember, setFinancialMember] = useState<FinancialMember | null>(null);
  const [serverTransactions, setServerTransactions] = useState<LocalSale[]>([]);
  const [visibleTransactionCount, setVisibleTransactionCount] = useState(TRANSACTIONS_PAGE_SIZE);
  const seenNotificationIdsRef = useRef<Set<string>>(new Set());
  const syncingRef = useRef(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setPageTitle(view === 'order' ? 'Fazer Pedido' : 'Carteira');
  }, [setPageTitle, view]);

  useEffect(() => {
    setView(requestedView);
  }, [requestedView]);

  useEffect(() => {
    let active = true;

    const loadFinancials = async () => {
      if (!session) return;

      try {
        const response = await fetch('/api/members/me/financials', { cache: 'no-store' });
        if (!response.ok) return;

        const payload = await response.json();
        if (!active) return;

        setFinancialMember(payload.member ?? null);
        setServerTransactions(Array.isArray(payload.sales) ? payload.sales : []);
      } catch {
        // Fallback silencioso para Dexie local
      }
    };

    void loadFinancials();

    return () => {
      active = false;
    };
  }, [session]);

  useEffect(() => {
    let cancelled = false;

    const refreshMemberSales = async () => {
      if (syncingRef.current) return;
      syncingRef.current = true;

      try {
        const payload = await syncMemberSalesFromServer();
        if (!cancelled) {
          setFinancialMember(payload.member ?? null);
          setServerTransactions(Array.isArray(payload.sales) ? payload.sales as LocalSale[] : []);
        }
      } catch {
        // Próxima notificação ou navegação tentará novamente.
      } finally {
        if (!cancelled) syncingRef.current = false;
      }
    };

    const nextIds = new Set(seenNotificationIdsRef.current);
    const hasNewMemberOrderEvent = notifications.some((notification) => {
      const isNew = !nextIds.has(notification.id);
      nextIds.add(notification.id);
      return isNew && notification.type.startsWith('canteen-order-');
    });

    seenNotificationIdsRef.current = nextIds;

    if (hasNewMemberOrderEvent) {
      void refreshMemberSales();
    }

    return () => {
      cancelled = true;
    };
  }, [notifications]);

  // Data Queries
  const products = useProducts();
  
  // Mock finding member by email
  const linkedMember = useLiveQuery(
    () => user?.email ? db.members.where('email').equals(user.email).first() : undefined,
    [user?.email]
  );

  // Mock sales history
  const transactions = useLiveQuery(
    () => linkedMember ? db.sales.where('memberId').equals(linkedMember.id).reverse().limit(10).toArray() : [],
    [linkedMember]
  );
  const pendingOrders = useLiveQuery(
    async () => {
      if (!linkedMember?.id) return [];

      const sales = await db.sales.where('memberId').equals(linkedMember.id).reverse().sortBy('createdAt');
      return sales
        .reverse()
        .filter((sale) => sale.paymentMethod === 'pending' || sale.orderStatus === 'preparing')
        .slice(0, 10);
    },
    [linkedMember?.id]
  ) || [];

  const loyaltyConfig = getLoyaltyConfig();
  const loyaltyProgress = linkedMember ? getLoyaltyProgress(linkedMember.id) : null;
  const resolvedMember = financialMember ?? linkedMember ?? null;
  const resolvedTransactions = useMemo(
    () =>
      (serverTransactions.length > 0 ? serverTransactions : (transactions ?? []))
        .filter((transaction) => transaction.paymentMethod !== 'pending' && transaction.paymentMethod !== 'cancelled')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [serverTransactions, transactions]
  );

  const visibleTransactions = useMemo(
    () => resolvedTransactions.slice(0, visibleTransactionCount),
    [resolvedTransactions, visibleTransactionCount]
  );

  const groupedTransactions = useMemo(() => {
    const groups: Array<{ label: string; items: LocalSale[] }> = [];

    visibleTransactions.forEach((transaction) => {
      const label = getMonthLabel(transaction.createdAt);
      const lastGroup = groups[groups.length - 1];

      if (!lastGroup || lastGroup.label !== label) {
        groups.push({ label, items: [transaction] });
        return;
      }

      lastGroup.items.push(transaction);
    });

    return groups;
  }, [visibleTransactions]);

  useEffect(() => {
    setVisibleTransactionCount(TRANSACTIONS_PAGE_SIZE);
  }, [resolvedTransactions.length]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || visibleTransactionCount >= resolvedTransactions.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleTransactionCount((current) =>
            Math.min(current + TRANSACTIONS_PAGE_SIZE, resolvedTransactions.length)
          );
        }
      },
      { rootMargin: '200px 0px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [resolvedTransactions.length, visibleTransactionCount]);

  // Filter Logic
  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category));
    return ['all', ...Array.from(cats)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
      const isAvailableToday = p.active !== false && p.availableToday !== false;
      return matchesSearch && matchesCategory && isAvailableToday;
    });
  }, [products, search, selectedCategory]);

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.total, 0), [cart]);
  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  // Cart Actions
  const addToCart = (product: LocalProduct) => {
    if (product.stock <= 0) { toast.error('Sem estoque!'); return; }
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) { toast.error('Estoque insuficiente!'); return prev; }
        return prev.map(item =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price }
            : item
        );
      }
      return [...prev, {
        productId: product.id, productName: product.name,
        quantity: 1, unitPrice: product.price, total: product.price, product,
      }];
    });
    toast.success(`${product.name} adicionado`);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId !== productId) return item;
      const newQty = item.quantity + delta;
      if (newQty <= 0) return { ...item, quantity: 0, total: 0 };
      if (newQty > item.product.stock) { toast.error('Estoque insuficiente!'); return item; }
      return { ...item, quantity: newQty, total: newQty * item.unitPrice };
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (productId: string) => setCart(prev => prev.filter(item => item.productId !== productId));

  const handleOrder = async () => {
    if (!linkedMember) { toast.error('Você precisa estar vinculado a um membro!'); return; }
    if (cart.length === 0) { toast.error('Carrinho vazio!'); return; }

    try {
      const saleId = generateId();
      const createdAt = new Date().toISOString();
      const sale: LocalSale = {
        id: saleId,
        items: cart.map(({ product, ...item }) => ({
          productId: item.productId,
          name: item.productName,
          quantity: item.quantity,
          price: item.unitPrice
        })),
        total: cartTotal,
        paymentMethod: 'pending',
        memberId: linkedMember.id,
        memberName: linkedMember.name,
        createdBy: user?.email || 'unknown',
        createdAt,
        _status: 'pending'
      };

      const response = await fetch('/api/canteen/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: saleId,
          items: sale.items,
          total: sale.total,
          paymentMethod: 'pending',
          memberId: sale.memberId,
          memberName: sale.memberName,
          createdBy: sale.createdBy,
          createdAt,
        }),
      });

      if (response.ok) {
        await db.sales.put({
          ...sale,
          _status: 'synced',
        });
        toast.success('Pedido enviado para aprovação da cantina!');
      } else {
        await db.sales.add(sale);
        await db.syncOutbox.add({
          module: 'sales',
          action: 'create',
          data: sale,
          timestamp: new Date().toISOString()
        });
        toast.success('Pedido salvo e aguardando sincronização!');
      }
      setCart([]);
      setCartOpen(false);
      setView('profile');
    } catch (error) {
      try {
        const sale: LocalSale = {
          id: generateId(),
          items: cart.map(({ product, ...item }) => ({
            productId: item.productId,
            name: item.productName,
            quantity: item.quantity,
            price: item.unitPrice
          })),
          total: cartTotal,
          paymentMethod: 'pending',
          memberId: linkedMember.id,
          memberName: linkedMember.name,
          createdBy: user?.email || 'unknown',
          createdAt: new Date().toISOString(),
          _status: 'pending'
        };

        await db.sales.add(sale);
        await db.syncOutbox.add({
          module: 'sales',
          action: 'create',
          data: sale,
          timestamp: new Date().toISOString()
        });
        toast.success('Pedido salvo e aguardando sincronização!');
        setCart([]);
        setCartOpen(false);
        setView('profile');
      } catch (offlineError) {
        toast.error('Erro ao processar pedido');
        console.error(offlineError);
      }
    }
  };

  if (!session) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-muted-foreground">Faça login para acessar sua carteira</p>
        <Button onClick={() => router.push('/auth/login')}>Fazer Login</Button>
      </div>
    );
  }

  // --- ORDER MODE VIEW ---
  if (view === 'order') {
    return (
      <div className="p-4 max-w-2xl mx-auto space-y-4 pb-24">
        <div className="flex items-center gap-2 mb-2">
          <Button variant="ghost" size="icon" onClick={() => router.replace('/carteira')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="font-semibold text-lg">Cardápio</h2>
        </div>

        <Tabs defaultValue="menu" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="menu">Cardápio</TabsTrigger>
            <TabsTrigger value="pending">
              Pendentes
              {pendingOrders.length > 0 ? <Badge className="ml-2">{pendingOrders.length}</Badge> : null}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="menu" className="space-y-4">
            <div className="relative">
              <Input
                placeholder="Buscar produto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
              <ShoppingBag className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
              {categories.map(cat => (
                <Badge
                  key={cat}
                  variant={selectedCategory === cat ? 'default' : 'outline'}
                  className="cursor-pointer whitespace-nowrap px-3 py-1 text-sm h-8"
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat === 'all' ? 'Todos' : cat}
                </Badge>
              ))}
            </div>

            {filteredProducts.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <p>Nenhum produto encontrado.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filteredProducts.map(product => {
                  const inCart = cart.find(c => c.productId === product.id);
                  return (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className={cn(
                        'bg-card border rounded-xl p-3 text-left transition-all hover:shadow-md relative group',
                        inCart ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20' : 'border-border hover:border-primary/30',
                        product.stock <= 0 && 'opacity-60 cursor-not-allowed bg-muted/50'
                      )}
                      disabled={product.stock <= 0}
                    >
                      {inCart && (
                        <span className="absolute -top-2 -right-2 w-6 h-6 bg-primary text-primary-foreground rounded-full text-xs font-bold flex items-center justify-center shadow-sm animate-in zoom-in duration-200">
                          {inCart.quantity}
                        </span>
                      )}
                      <div className="flex flex-col h-full justify-between gap-2">
                        <div className="overflow-hidden rounded-lg border bg-muted/30">
                          <div className="aspect-[4/3] w-full">
                            {product.imageUrl ? (
                              <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full items-center justify-center">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                  <Package className="h-5 w-5" />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          <h3 className="font-medium text-sm line-clamp-2 leading-tight">{product.name}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{product.category}</p>
                        </div>
                        <div className="flex items-end justify-between">
                          <span className="font-bold text-primary">R$ {product.price.toFixed(2)}</span>
                          {product.stock <= 0 && <Badge variant="destructive" className="text-[10px] h-5 px-1.5">Esgotado</Badge>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pending">
            {pendingOrders.length > 0 ? (
              <div className="space-y-2">
                {pendingOrders.map((order) => (
                  <div key={order.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">Pedido #{order.id.slice(-4)}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.items.map((item) => `${item.quantity}x ${item.name}`).join(', ')}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {order.paymentMethod === 'pending' ? 'Aguardando cantina' : 'Em preparo'}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm font-bold text-primary">R$ {order.total.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                <p>Nenhum pedido aguardando no momento.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {cart.length > 0 && (
          <Sheet open={cartOpen} onOpenChange={setCartOpen}>
            <SheetTrigger asChild>
              <button className="fixed bottom-20 left-4 right-4 z-40 bg-primary text-primary-foreground rounded-xl p-4 flex items-center justify-between shadow-lg active:scale-[0.98] transition-transform md:max-w-md md:mx-auto">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-lg">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-sm leading-tight">{cartCount} item(s)</p>
                    <p className="text-xs opacity-90">Ver carrinho</p>
                  </div>
                </div>
                <span className="font-bold text-lg">R$ {cartTotal.toFixed(2)}</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl px-0 pb-0">
              <SheetHeader className="px-6 pb-4 border-b">
                <SheetTitle>Seu Pedido</SheetTitle>
              </SheetHeader>
              <ScrollArea className="flex-1 px-6 py-4 h-full">
                <div className="space-y-4 pb-20">
                  {cart.map(item => (
                    <div key={item.productId} className="flex items-center gap-3 bg-muted/30 rounded-lg p-3 border border-border/50">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.productName}</p>
                        <p className="text-xs text-muted-foreground">R$ {item.unitPrice.toFixed(2)} un.</p>
                      </div>
                      <div className="flex items-center gap-2 bg-background rounded-md border p-1 shadow-sm">
                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-sm" onClick={() => updateQuantity(item.productId, -1)}>
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-sm" onClick={() => updateQuantity(item.productId, 1)}>
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="text-right min-w-[60px]">
                        <p className="font-bold text-sm">R$ {item.total.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="absolute bottom-0 left-0 right-0 bg-background border-t p-6 space-y-4 pb-8 safe-area-pb">
                <div className="flex items-center justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">R$ {cartTotal.toFixed(2)}</span>
                </div>
                {!linkedMember && (
                  <div className="bg-warning/10 rounded-lg p-3 flex items-center gap-2 text-sm text-warning border border-warning/20">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Você precisa estar cadastrado como membro para fazer pedidos</span>
                  </div>
                )}
                <Button className="w-full h-12 text-base shadow-lg shadow-primary/20" size="lg" disabled={!linkedMember} onClick={handleOrder}>
                  Confirmar Pedido (Fiado)
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>
    );
  }

  // --- PROFILE VIEW ---
  return (
    <div className="p-4 max-w-lg mx-auto space-y-6 pb-20">
      {/* Balance & Loyalty Group */}
      <div className="grid gap-4">
        {/* Balance */}
        {resolvedMember ? (
          <Card className="border-border">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center shrink-0">
                  <Wallet className="w-6 h-6 text-yellow-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Saldo em Aberto</p>
                  <p className="text-2xl font-bold text-foreground">
                    R$ {(resolvedMember.creditBalance ?? 0).toFixed(2)}
                  </p>
                </div>
                {(resolvedMember.creditBalance ?? 0) > 0 && (
                  <Button variant="ghost" size="icon" className="text-primary hover:bg-primary/10">
                    <MessageCircle className="w-5 h-5" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="p-6 text-center">
              <Wallet className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Vincule sua conta para ver seu saldo.</p>
            </CardContent>
          </Card>
        )}

        {/* Loyalty */}
        {isLoyaltyActive(loyaltyConfig) && linkedMember && loyaltyProgress && (
          <Card className="border-border overflow-hidden">
            <div className="bg-gradient-to-r from-primary/5 to-transparent px-4 py-3 flex items-center gap-2 border-b border-border/50">
              <Gift className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm">Programa de Fidelidade</h3>
            </div>
            <CardContent className="p-5">
              {loyaltyProgress.hasReward ? (
                <div className="bg-green-500/10 rounded-xl p-4 text-center border border-green-500/20">
                  <Gift className="w-8 h-8 text-green-600 mx-auto mb-2 animate-bounce" />
                  <p className="font-bold text-green-700">Recompensa Disponível!</p>
                  <p className="text-xs text-green-600/80 mt-1">Você ganhou {loyaltyConfig.discountPercent}% de desconto na próxima compra.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground font-medium">
                      Progresso atual
                    </span>
                    <span className="font-bold text-primary">{loyaltyProgress.current} / {loyaltyProgress.target}</span>
                  </div>
                  <Progress value={loyaltyProgress.percentage} className="h-2.5" />
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    Faltam {loyaltyProgress.target - loyaltyProgress.current} compras para ganhar {loyaltyConfig.discountPercent}% off
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-3">
        <Button variant="outline" className="h-24 flex-col gap-3 bg-card hover:bg-primary/5 hover:border-primary/30 transition-all shadow-sm border-border" onClick={() => router.replace('/carteira?view=order')}>
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-primary" />
          </div>
          <span className="font-medium text-sm">Fazer Pedido</span>
        </Button>
      </div>

      {/* Transaction History */}
      {resolvedMember && resolvedTransactions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2 text-sm">
              <Receipt className="w-4 h-4 text-muted-foreground" />
              Carteira
            </h3>
          </div>
          <div className="space-y-5">
            {groupedTransactions.map((group) => (
              <div key={group.label} className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
                  {group.label}
                </div>
                <div className="space-y-2">
                  {group.items.map((transaction) => (
                    <div key={transaction.id} className="bg-card rounded-xl p-3 border border-border flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold",
                          transaction.paymentMethod === 'fiado' ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500"
                        )}>
                          {transaction.paymentMethod === 'fiado' ? '-' : '+'}
                        </div>
                        <div>
                          <p className="font-medium text-sm line-clamp-1">{transaction.items?.length || 0} itens</p>
                          <p className="text-[10px] text-muted-foreground">
                            {format(new Date(transaction.createdAt), "dd MMM 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <span className="font-bold text-sm">R$ {transaction.total.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {visibleTransactionCount < resolvedTransactions.length ? (
              <div ref={loadMoreRef} className="py-4 text-center text-xs text-muted-foreground">
                Carregando mais movimentações...
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
