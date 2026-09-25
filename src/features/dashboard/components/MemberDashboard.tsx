'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type LocalProduct, type LocalSale } from '@/lib/db';
import { useProducts } from '@/features/canteen/hooks/use-products';
import { 
  BookOpen, 
  Flame, 
  Trophy, 
  Gift, 
  Megaphone, 
  Pin, 
  ShoppingBag, 
  Gamepad2, 
  MessageCircle, 
  UserPlus, 
  CheckCircle2,
  Search,
  Plus,
  Minus,
  AlertCircle,
  Package,
} from 'lucide-react';
import { 
  getDailyDevotional, 
  getDevotionalStreak, 
  hasReadDevotionalToday,
  markDevotionalRead, 
  markChallengeCompleted, 
  isChallengeCompleted, 
  getTotalPoints, 
  Devotional 
} from '@/lib/devotional';
import { 
  getLoyaltyConfig, 
  getLoyaltyProgress, 
  isLoyaltyActive 
} from '@/lib/loyalty';
import { toast } from 'sonner';
import { useNotificationCenter } from '@/hooks/use-notification-center';
import { syncMemberSalesFromServer } from '@/features/canteen/lib/sync-member-sales';
import { generateId } from '@/lib/id';
import { hasActionPermission } from '@/lib/access-control';
import { getEngagementProfile, updateEngagementProfile } from '@/services/engagement/engagement-api';
import { createMemberSale } from '@/services/canteen/member-sales-api';

export function MemberDashboard() {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user;
  const canCatalog = hasActionPermission(user, 'canteen', 'catalog');
  const canOrder = canCatalog && hasActionPermission(user, 'canteen', 'order');
  const products = useProducts(canCatalog);
  const { notifications } = useNotificationCenter();

  // Devotional State - Inicialização direta
  const [devotional] = useState(() => getDailyDevotional());
  const [streak, setStreak] = useState(() => getDevotionalStreak());
  const [points, setPoints] = useState(() => getTotalPoints());
  const [rank, setRank] = useState<number | null>(null);
  const [challengeDone, setChallengeDone] = useState(false);
  const [devotionalRead, setDevotionalRead] = useState(() => hasReadDevotionalToday());
  const [orderOpen, setOrderOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cart, setCart] = useState<any[]>([]);
  const seenNotificationIdsRef = useRef<Set<string>>(new Set());
  const syncingRef = useRef(false);

  const linkedMember = useLiveQuery(
    () => user?.email ? db.members.where('email').equals(user.email).first() : undefined,
    [user?.email]
  );

  const pendingOrders = useLiveQuery(
    async () => {
      if (!linkedMember?.id) return [];

      const sales = await db.sales.where('memberId').equals(linkedMember.id).reverse().sortBy('createdAt');
      return sales
        .reverse()
        .filter((sale) => sale.paymentMethod === 'pending' || sale.orderStatus === 'preparing')
        .slice(0, 5);
    },
    [linkedMember?.id]
  ) || [];

  const categories = useMemo(() => {
    const cats = new Set(products.map((product) => product.category));
    return ['all', ...Array.from(cats)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      const isAvailableToday = product.active !== false && product.availableToday !== false;
      return matchesSearch && matchesCategory && isAvailableToday;
    });
  }, [products, search, selectedCategory]);

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.total, 0), [cart]);
  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  useEffect(() => {
    if (devotional) {
      setChallengeDone(isChallengeCompleted(devotional.id));
    }
  }, [devotional]);

  useEffect(() => {
    const loadEngagement = async () => {
      try {
        const data = await getEngagementProfile();
        setStreak(Number(data.devotionalStreak) || 0);
        setPoints(Number(data.points) || 0);
        setRank(typeof data.rank === 'number' ? data.rank : null);
        setDevotionalRead(Boolean(data.devotionalReadToday));
        setChallengeDone(Array.isArray(data.completedChallengeIds) && data.completedChallengeIds.includes(devotional.id));
      } catch {
        setStreak(getDevotionalStreak());
        setPoints(getTotalPoints());
        setRank(null);
        setDevotionalRead(hasReadDevotionalToday());
      }
    };

    void loadEngagement();
  }, [devotional.id]);

  useEffect(() => {
    let cancelled = false;

    const refreshMemberSales = async () => {
      if (syncingRef.current) return;
      syncingRef.current = true;

      try {
        await syncMemberSalesFromServer();
      } catch {
        // Próxima notificação ou recarga tenta de novo.
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

  const handleReadDevotional = () => {
    const persist = async () => {
      try {
        const data = await updateEngagementProfile({ action: 'markDevotionalRead' });
        setStreak(Number(data.devotionalStreak) || 0);
        setPoints(Number(data.points) || 0);
        setRank(typeof data.rank === 'number' ? data.rank : null);
        setDevotionalRead(Boolean(data.devotionalReadToday));
      } catch {
        const newStreak = markDevotionalRead();
        setStreak(newStreak);
        setDevotionalRead(true);
      } finally {
        toast.success('Devocional lido! Continue assim!');
      }
    };

    void persist();
  };

  const handleCompleteChallenge = () => {
    if (!devotional) return;

    const persist = async () => {
      try {
        const data = await updateEngagementProfile({ action: 'completeChallenge', devotionalId: devotional.id });
        setPoints(Number(data.points) || 0);
      } catch {
        markChallengeCompleted(devotional.id);
        setPoints(getTotalPoints());
      } finally {
        setChallengeDone(true);
        toast.success(`Desafio completo! +${devotional.challengePoints} pontos`);
      }
    };

    void persist();
  };

  const addToCart = (product: LocalProduct) => {
    if (product.stock <= 0) {
      toast.error('Sem estoque!');
      return;
    }

    setCart((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast.error('Estoque insuficiente!');
          return current;
        }

        return current.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.unitPrice }
            : item
        );
      }

      return [
        ...current,
        {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          unitPrice: product.price,
          total: product.price,
          product,
        },
      ];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((current) => current
      .map((item) => {
        if (item.productId !== productId) return item;

        const newQty = item.quantity + delta;
        if (newQty <= 0) return { ...item, quantity: 0, total: 0 };
        if (newQty > item.product.stock) {
          toast.error('Estoque insuficiente!');
          return item;
        }

        return { ...item, quantity: newQty, total: newQty * item.unitPrice };
      })
      .filter((item) => item.quantity > 0));
  };

  const handleOrder = async () => {
    if (!linkedMember) {
      toast.error('Você precisa estar vinculado a um membro!');
      return;
    }

    if (cart.length === 0) {
      toast.error('Carrinho vazio!');
      return;
    }

    try {
      const saleId = generateId();
      const createdAt = new Date().toISOString();
      const sale: LocalSale = {
        id: saleId,
        items: cart.map(({ product, ...item }) => ({
          productId: item.productId,
          name: item.productName,
          quantity: item.quantity,
          price: item.unitPrice,
        })),
        total: cartTotal,
        paymentMethod: 'pending',
        memberId: linkedMember.id,
        memberName: linkedMember.name,
        createdBy: user?.email || 'unknown',
        createdAt,
        _status: 'pending',
      };

      try {
        await createMemberSale({
          id: saleId,
          items: sale.items,
          total: sale.total,
          paymentMethod: 'pending',
          memberId: sale.memberId,
          memberName: sale.memberName,
          createdBy: sale.createdBy,
          createdAt,
        });
        await db.sales.put({
          ...sale,
          _status: 'synced',
        });
        toast.success('Pedido enviado para aprovação da cantina!');
      } catch {
        await db.sales.add(sale);
        await db.syncOutbox.add({
          module: 'sales',
          action: 'create',
          data: sale,
          timestamp: new Date().toISOString(),
        });
        toast.success('Pedido salvo e aguardando sincronização!');
      }

      setCart([]);
      setCartOpen(false);
      setOrderOpen(false);
    } catch (error) {
      try {
        const sale: LocalSale = {
          id: generateId(),
          items: cart.map(({ product, ...item }) => ({
            productId: item.productId,
            name: item.productName,
            quantity: item.quantity,
            price: item.unitPrice,
          })),
          total: cartTotal,
          paymentMethod: 'pending',
          memberId: linkedMember.id,
          memberName: linkedMember.name,
          createdBy: user?.email || 'unknown',
          createdAt: new Date().toISOString(),
          _status: 'pending',
        };

        await db.sales.add(sale);
        await db.syncOutbox.add({
          module: 'sales',
          action: 'create',
          data: sale,
          timestamp: new Date().toISOString(),
        });
        toast.success('Pedido salvo e aguardando sincronização!');
        setCart([]);
        setCartOpen(false);
        setOrderOpen(false);
      } catch (offlineError) {
        toast.error('Erro ao processar pedido');
        console.error(offlineError);
      }
    }
  };

  if (!devotional) return <div>Carregando...</div>;

  return (
    <div className="mx-auto max-w-lg space-y-4 pb-20 sm:space-y-6">
      <Card className="border-border bg-card p-3 sm:p-4">
        <div className="grid grid-cols-3 gap-2 text-center sm:gap-3">
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{points}</p>
            <p className="text-[10px] text-muted-foreground">Pontos</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{streak} 🔥</p>
            <p className="text-[10px] text-muted-foreground">Dias Seguidos</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{rank ? `#${rank}` : '-'}</p>
            <p className="text-[10px] text-muted-foreground">Ranking</p>
          </div>
        </div>
      </Card>

      {/* Devotional Card */}
      <Card className="overflow-hidden border-border">
          <div className="flex items-center justify-between bg-primary/5 p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-sm">Devocional do Dia</h3>
          </div>
          {streak > 0 && (
            <div className="flex items-center gap-1 bg-yellow-500/10 px-2.5 py-1 rounded-full">
              <Flame className="w-3.5 h-3.5 text-yellow-500" />
              <span className="text-xs font-bold text-yellow-500">{streak} dias</span>
            </div>
          )}
        </div>
        <div className="space-y-3 p-3 sm:p-4">
          <blockquote className="border-l-4 border-primary pl-3 italic text-sm text-foreground/90">
            "{devotional.verse}"
          </blockquote>
          <p className="text-xs font-semibold text-primary">{devotional.reference}</p>
          
          {!devotionalRead ? (
            <>
              <p className="text-sm text-muted-foreground">{devotional.reflection}</p>
              <Button size="sm" className="mt-2 w-full gap-2" onClick={handleReadDevotional}>
                <BookOpen className="w-4 h-4" /> Marcar como lido
              </Button>
            </>
          ) : (
            <div className="mt-2 space-y-3">
              <div className="rounded-lg bg-green-500/10 p-3">
                <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Devocional lido hoje</span>
                </div>
              </div>

              {!challengeDone ? (
                <div className="rounded-lg border border-border bg-background/60 p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm font-semibold">Desafio do dia</span>
                    {devotional.challengePoints ? (
                      <Badge variant="secondary" className="h-5 text-[10px]">
                        +{devotional.challengePoints} pts
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">{devotional.challenge}</p>
                  <Button size="sm" variant="outline" className="mt-3 w-full gap-2" onClick={handleCompleteChallenge}>
                    <Trophy className="h-3.5 w-3.5" />
                    Resgatar pontos do desafio
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </Card>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {canOrder ? <Button variant="outline" className="h-20 flex-col gap-2 border-border bg-card hover:bg-muted/50" onClick={() => router.push('/carteira?view=order')}>
          <ShoppingBag className="w-6 h-6 text-primary" />
          <span className="text-xs font-medium">Fazer Pedido</span>
        </Button> : null}
        <Button variant="outline" className="h-20 flex-col gap-2 border-border bg-card hover:bg-muted/50" onClick={() => router.push('/quiz')}>
          <Trophy className="w-6 h-6 text-yellow-500" />
          <span className="text-xs font-medium">Quiz Bíblico</span>
        </Button>
        <Button variant="outline" className="h-20 flex-col gap-2 border-border bg-card hover:bg-muted/50" onClick={() => router.push('/jogos-novos')}>
          <Gamepad2 className="w-6 h-6 text-primary" />
          <span className="text-xs font-medium">Jogos</span>
        </Button>
        <Button variant="outline" className="h-20 flex-col gap-2 border-border bg-card hover:bg-muted/50" onClick={() => router.push('/bible')}>
          <BookOpen className="w-6 h-6 text-primary" />
          <span className="text-xs font-medium">Ler Bíblia</span>
        </Button>
        <Button variant="outline" className="h-20 flex-col gap-2 border-border bg-card hover:bg-muted/50" onClick={() => router.push('/feed')}>
          <MessageCircle className="w-6 h-6 text-primary" />
          <span className="text-xs font-medium">Comunidade</span>
        </Button>
        <Button variant="outline" className="h-20 flex-col gap-2 border-border bg-card hover:bg-muted/50" onClick={() => router.push('/groups?type=team')}>
          <UserPlus className="w-6 h-6 text-primary" />
          <span className="text-xs font-medium">Entrar em Grupo</span>
        </Button>
      </div>

      {canOrder ? <Drawer open={orderOpen} onOpenChange={(open) => {
        setOrderOpen(open);
        if (!open) setCartOpen(false);
      }}>
        <DrawerContent className="relative max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>Fazer Pedido</DrawerTitle>
          </DrawerHeader>
          <Tabs defaultValue="menu" className="overflow-y-auto px-4 pb-24">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="menu">Cardápio</TabsTrigger>
              <TabsTrigger value="pending">
                Pendentes
                {pendingOrders.length > 0 ? <Badge className="ml-2">{pendingOrders.length}</Badge> : null}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="menu" className="mt-4 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar produto..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1">
                {categories.map((category) => (
                  <Badge
                    key={category}
                    variant={selectedCategory === category ? 'default' : 'outline'}
                    className="cursor-pointer whitespace-nowrap"
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category === 'all' ? 'Todos' : category}
                  </Badge>
                ))}
              </div>

              {filteredProducts.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">
                  <p>Nenhum produto encontrado.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {filteredProducts.map((product) => {
                    const inCart = cart.find((item) => item.productId === product.id);

                    return (
                      <button
                        key={product.id}
                        onClick={() => addToCart(product)}
                        className="rounded-xl border border-border bg-card p-3 text-left transition-all hover:border-primary/30 hover:shadow-sm"
                        disabled={product.stock <= 0}
                      >
                        <div className="relative overflow-hidden rounded-lg border border-border bg-muted/30">
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
                          {inCart ? <Badge className="absolute right-2 top-2">{inCart.quantity}x</Badge> : null}
                        </div>
                        <div className="mt-3">
                          <p className="font-medium text-sm line-clamp-2">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.category}</p>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="font-bold text-primary">R$ {product.price.toFixed(2)}</span>
                          {product.stock <= 0 ? <Badge variant="destructive">Esgotado</Badge> : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="pending" className="mt-4">
              {pendingOrders.length > 0 ? (
                <div className="space-y-2">
                  {pendingOrders.map((order) => (
                    <div key={order.id} className="rounded-lg border border-border p-3">
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
                <div className="py-10 text-center text-muted-foreground">
                  <p>Nenhum pedido aguardando no momento.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {cart.length > 0 ? (
            <>
              <Button
                type="button"
                className="absolute bottom-4 left-4 right-4 h-12 justify-between shadow-lg"
                onClick={() => setCartOpen(true)}
              >
                <span className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4" />
                  Carrinho
                  <Badge variant="secondary" className="text-xs">{cartCount}</Badge>
                </span>
                <span>R$ {cartTotal.toFixed(2)}</span>
              </Button>

              <Drawer open={cartOpen} onOpenChange={setCartOpen}>
                <DrawerContent className="max-h-[80vh]">
                  <DrawerHeader>
                    <DrawerTitle>Seu Carrinho</DrawerTitle>
                  </DrawerHeader>
                  <div className="space-y-4 overflow-y-auto px-4 pb-6">
                    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm">Itens</h3>
                        <span className="text-sm font-bold">R$ {cartTotal.toFixed(2)}</span>
                      </div>

                      <div className="space-y-2">
                        {cart.map((item) => (
                          <div key={item.productId} className="flex items-center gap-2 rounded-lg border border-border p-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{item.productName}</p>
                              <p className="text-xs text-muted-foreground">R$ {item.unitPrice.toFixed(2)} un.</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.productId, -1)}>
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="w-6 text-center text-sm">{item.quantity}</span>
                              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.productId, 1)}>
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {!linkedMember ? (
                        <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>Você precisa estar vinculado a um membro para fazer pedidos.</span>
                        </div>
                      ) : null}

                      <Button className="w-full" disabled={!linkedMember || cart.length === 0} onClick={handleOrder}>
                        Confirmar Pedido
                      </Button>
                    </div>
                  </div>
                </DrawerContent>
              </Drawer>
            </>
          ) : null}
        </DrawerContent>
      </Drawer> : null}
    </div>
  );
}
