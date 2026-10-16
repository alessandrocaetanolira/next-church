/**
 * features/canteen/components/CanteenContainer.tsx
 * 
 * Contém a navegação e o conteúdo das abas da Cantina.
 * Fiel ao layout original usando Tabs do shadcn/ui.
 */

"use client";

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CanteenCartView } from './CanteenCartView';
import { PreparoView } from './PreparoView';
import { SalesHistory } from './SalesHistory';
import { ProductsManager } from './ProductsManager';
import { MemberOrdersView } from './MemberOrdersView';
import { CatalogView } from './CatalogView';
import { LoyaltySettings } from '@/features/settings/components/LoyaltySettings';
import { ShoppingCart, ChefHat, Package, Receipt, BellPlus, Award } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { db } from '@/lib/db';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { getCanteenAccess, resolveCanteenView } from '@/lib/canteen/access';
import { useCanteenStatus } from '../hooks/use-canteen-status';
import { useNotificationCenter } from '@/hooks/use-notification-center';
import { syncCanteenSalesFromServer } from '@/features/canteen/lib/sync-sales';
import { syncCanteenMembersFromServer } from '@/features/canteen/lib/sync-members';
import { CanteenStatusBanner } from './CanteenStatusBanner';

export function CanteenContainer() {
  const { user } = useAuth();
  const { canBrowse, canSell, canUseCart, canOperate, canManageProducts,
    canManage: canManageCanteen, canViewSales, operationalTabs } = getCanteenAccess(user);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { notifications } = useNotificationCenter();
  const tabFromUrl = searchParams.get('tab');
  const activeTab = resolveCanteenView(user, tabFromUrl);
  const operation = useCanteenStatus(canBrowse || canOperate || canSell);
  const { status: canteenStatus, loading: loadingStatus, updating: updatingStatus, confirmed: statusConfirmed,
    error: statusError, refresh: refreshStatus, setOpen } = operation;
  const tenantId = user?.tenantId ?? '';
  const sales = useLiveQuery(() => tenantId ? db.sales.filter((sale) => sale.tenantId === tenantId && !sale.deletedAt).toArray() : [], [tenantId]) ?? [];
  const seenNotificationIdsRef = useRef<Set<string>>(new Set());
  const syncingRef = useRef(false);
  const pendingOrders = sales.filter((sale) => sale.paymentMethod === 'pending').length;
  const preparingOrders = sales.filter(
    (sale) =>
      sale.paymentMethod !== 'pending' &&
      sale.paymentMethod !== 'cancelled' &&
      sale.orderStatus === 'preparing'
  ).length;
  const queryString = useMemo(() => searchParams.toString(), [searchParams]);

  const toggleCanteen = async () => {
    if (!canOperate || updatingStatus || loadingStatus || !statusConfirmed) return;
    try {
      await setOpen(!canteenStatus.isOpen);
    } catch {
      await refreshStatus();
      toast.error('Não foi possível confirmar a alteração da cantina. Verifique o status e tente novamente.');
    }
  };

  const refreshSales = useCallback(async () => {
    if (!canViewSales && !canOperate) return;
    if (syncingRef.current) return;
    syncingRef.current = true;
    try {
      const [syncedSales, syncedMembers] = await Promise.all([
        syncCanteenSalesFromServer(tenantId),
        syncCanteenMembersFromServer(tenantId),
      ]);
      console.info('[canteen-fiado] refresh canteen state', {
        sales: syncedSales.length,
        members: syncedMembers.length,
      });
    } catch {
      // Mantém o estado atual; a próxima notificação ou sync tentará novamente.
    } finally {
      syncingRef.current = false;
    }
  }, [tenantId, canViewSales, canOperate]);

  useEffect(() => {
    const nextIds = new Set(seenNotificationIdsRef.current);
    const hasNewCanteenEvent = notifications.some((notification) => {
      const isNew = !nextIds.has(notification.id);
      nextIds.add(notification.id);
      return isNew && (notification.type.startsWith('canteen-order-') || notification.type.startsWith('canteen-credit-'));
    });

    seenNotificationIdsRef.current = nextIds;

    if (hasNewCanteenEvent) {
      void refreshSales();
    }
  }, [notifications, refreshSales]);

  useEffect(() => {
    const handleCanteenUpdate = () => { void refreshSales(); };
    window.addEventListener('church:canteen-order-updated', handleCanteenUpdate);
    window.addEventListener('online', handleCanteenUpdate);
    document.addEventListener('visibilitychange', handleCanteenUpdate);
    return () => {
      window.removeEventListener('church:canteen-order-updated', handleCanteenUpdate);
      window.removeEventListener('online', handleCanteenUpdate);
      document.removeEventListener('visibilitychange', handleCanteenUpdate);
    };
  }, [refreshSales]);

  const handleTabChange = (value: string) => {
    if (!operationalTabs.some((tab) => tab === value) && !(value === 'cart' && canUseCart)) return;

    const nextTab = value;

    const params = new URLSearchParams(queryString);
    if (nextTab === 'cart') {
      params.delete('tab');
    } else {
      params.set('tab', nextTab);
    }

    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  };

  return (
    <div className="space-y-4">
      {activeTab !== 'none' ? <CanteenStatusBanner operation={operation} /> : null}
      {canOperate ? <div className="flex flex-wrap justify-end gap-2">
          {statusError ? <Button size="sm" variant="outline" disabled={loadingStatus} onClick={() => void refreshStatus()}>Tentar novamente</Button> : null}
          <Button size="sm" variant={canteenStatus.isOpen ? 'outline' : 'default'} onClick={() => void toggleCanteen()} disabled={updatingStatus || loadingStatus || !statusConfirmed}>
            {updatingStatus ? 'Atualizando...' : canteenStatus.isOpen ? 'Fechar cantina' : 'Abrir cantina'}
          </Button>
      </div> : null}
    {activeTab === 'none' ? <p role="status" className="py-8 text-center text-sm text-muted-foreground">Você não tem acesso à Cantina.</p>
      : operationalTabs.length === 0 ? activeTab === 'cart' ? <CanteenCartView /> : <CatalogView />
      : <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
      <TabsList className="grid h-auto w-full grid-flow-col auto-cols-max gap-1 overflow-x-auto p-1 md:auto-cols-fr md:overflow-visible">
        {canUseCart ? <TabsTrigger value="cart" className="min-w-[84px] shrink-0 gap-1.5 px-3 py-2 text-xs md:min-w-0 md:text-sm">
          <ShoppingCart className="w-4 h-4" />
          <span>Carrinho</span>
        </TabsTrigger> : null}
        {canOperate ? <TabsTrigger value="orders" className="relative min-w-[84px] shrink-0 gap-1.5 px-3 py-2 text-xs md:min-w-0 md:text-sm">
          <BellPlus className={cn('w-4 h-4', pendingOrders > 0 && 'text-primary')} />
          <span className="hidden sm:inline">Pedidos</span>
          {pendingOrders > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {pendingOrders}
            </span>
          ) : null}
        </TabsTrigger> : null}
        {canOperate ? <TabsTrigger value="prep" className="relative min-w-[84px] shrink-0 gap-1.5 px-3 py-2 text-xs md:min-w-0 md:text-sm">
          <ChefHat className={cn('w-4 h-4', preparingOrders > 0 && 'animate-pulse text-warning')} />
          <span className="hidden sm:inline">Preparo</span>
          {preparingOrders > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-warning px-1 text-[10px] font-bold text-warning-foreground">
              {preparingOrders}
            </span>
          ) : null}
        </TabsTrigger> : null}
        {canManageProducts ? <TabsTrigger value="products" className="min-w-[84px] shrink-0 gap-1.5 px-3 py-2 text-xs md:min-w-0 md:text-sm">
          <Package className="w-4 h-4" />
          <span className="hidden sm:inline">Produtos</span>
        </TabsTrigger> : null}
        {canViewSales ? <TabsTrigger value="sales" className="min-w-[84px] shrink-0 gap-1.5 px-3 py-2 text-xs md:min-w-0 md:text-sm">
          <Receipt className="w-4 h-4" />
          <span className="hidden sm:inline">Vendas</span>
        </TabsTrigger> : null}
        {canManageCanteen ? <TabsTrigger value="loyalty" className="min-w-[84px] shrink-0 gap-1.5 px-3 py-2 text-xs md:min-w-0 md:text-sm">
          <Award className="w-4 h-4" />
          <span className="hidden sm:inline">Fidelidade</span>
        </TabsTrigger> : null}
      </TabsList>

      {canUseCart ? <TabsContent value="cart" className="mt-0"><CanteenCartView /></TabsContent> : null}
      {canOperate ? <TabsContent value="orders" className="mt-0"><MemberOrdersView /></TabsContent> : null}
      {canOperate ? <TabsContent value="prep" className="mt-0"><PreparoView /></TabsContent> : null}
      {canViewSales ? <TabsContent value="sales" className="mt-0"><SalesHistory /></TabsContent> : null}
      {canManageProducts ? <TabsContent value="products" className="mt-0"><ProductsManager /></TabsContent> : null}
      {canManageCanteen ? <TabsContent value="loyalty" className="mt-0"><LoyaltySettings /></TabsContent> : null}
    </Tabs>}
    </div>
  );
}
