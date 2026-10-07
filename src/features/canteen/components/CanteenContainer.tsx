/**
 * features/canteen/components/CanteenContainer.tsx
 * 
 * Contém a navegação e o conteúdo das abas da Cantina.
 * Fiel ao layout original usando Tabs do shadcn/ui.
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { PDV } from './PDV';
import { PreparoView } from './PreparoView';
import { SalesHistory } from './SalesHistory';
import { ProductsManager } from './ProductsManager';
import { MemberOrdersView } from './MemberOrdersView';
import { MemberOrderView } from './MemberOrderView';
import { LoyaltySettings } from '@/features/settings/components/LoyaltySettings';
import { ShoppingCart, ChefHat, Package, Receipt, BellPlus, Award } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/db';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { hasActionPermission } from '@/lib/access-control';
import { getCanteenStatus, setCanteenStatus as setCanteenStatusRequest } from '@/services/canteen/operations-api';
import { useNotificationCenter } from '@/hooks/use-notification-center';
import { syncCanteenSalesFromServer } from '@/features/canteen/lib/sync-sales';
import { syncCanteenMembersFromServer } from '@/features/canteen/lib/sync-members';

const VALID_TABS = ['pdv', 'orders', 'prep', 'products', 'sales', 'loyalty'] as const;
type CanteenTab = (typeof VALID_TABS)[number];

export function CanteenContainer() {
  const { user } = useAuth();
  const canSell = hasActionPermission(user, 'canteen', 'sell');
  const canOrder = hasActionPermission(user, 'canteen', 'order');
  const canOperate = hasActionPermission(user, 'canteen', 'operate');
  const canManageProducts = hasActionPermission(user, 'canteen', 'manage_products');
  const canManageCanteen = hasActionPermission(user, 'canteen', 'manage');
  const canViewSales = hasActionPermission(user, 'canteen', 'view');
  const firstAvailableTab: CanteenTab = canSell
    ? 'pdv'
    : canOperate
      ? 'orders'
      : canManageProducts
        ? 'products'
        : canManageCanteen
          ? 'loyalty'
          : 'sales';
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { notifications } = useNotificationCenter();
  const tabFromUrl = searchParams.get('tab');
  const initialTab = (VALID_TABS.includes((tabFromUrl ?? '') as CanteenTab) && (
    (tabFromUrl === 'pdv' && canSell) ||
    ((tabFromUrl === 'orders' || tabFromUrl === 'prep') && canOperate) ||
        (tabFromUrl === 'products' && canManageProducts) ||
    (tabFromUrl === 'sales' && canViewSales) ||
    (tabFromUrl === 'loyalty' && canManageCanteen)
  ) ? tabFromUrl : firstAvailableTab) as CanteenTab;
  const [activeTab, setActiveTab] = useState<CanteenTab>(initialTab);
  const [canteenStatus, setCanteenStatus] = useState<{ isOpen: boolean; openedAt: string | null }>({ isOpen: false, openedAt: null });
  const [updatingStatus, setUpdatingStatus] = useState(false);
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

  useEffect(() => {
    const requestedTab = tabFromUrl as CanteenTab;
    const canAccessRequestedTab =
      (requestedTab === 'pdv' && canSell) ||
      ((requestedTab === 'orders' || requestedTab === 'prep') && canOperate) ||
      (requestedTab === 'products' && canManageProducts) ||
      (requestedTab === 'sales' && canViewSales) ||
      (requestedTab === 'loyalty' && canManageCanteen);
    const nextTab = VALID_TABS.includes(requestedTab) && canAccessRequestedTab
      ? requestedTab
      : firstAvailableTab;

    setActiveTab((current) => (current === nextTab ? current : nextTab));
  }, [tabFromUrl, canSell, canOperate, canManageProducts, canViewSales, canManageCanteen, firstAvailableTab]);

  useEffect(() => {
    if (!canViewSales && !canOperate && !canSell && !canOrder) return;
    void getCanteenStatus()
      .then((status) => {
        if (status) setCanteenStatus({ isOpen: Boolean(status.isOpen), openedAt: status.openedAt ?? null });
      })
      .catch(() => undefined);
  }, [canViewSales, canOperate, canSell, canOrder]);

  const toggleCanteen = async () => {
    if (!canOperate || updatingStatus) return;
    setUpdatingStatus(true);
    try {
      const status = await setCanteenStatusRequest(!canteenStatus.isOpen);
      setCanteenStatus({ isOpen: Boolean(status.isOpen), openedAt: status.openedAt ?? null });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const refreshSales = useCallback(async () => {
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
  }, [tenantId]);

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
    if (!VALID_TABS.includes(value as CanteenTab)) return;

    const nextTab = value as CanteenTab;
    setActiveTab(nextTab);

    const params = new URLSearchParams(queryString);
    if (nextTab === 'pdv') {
      params.delete('tab');
    } else {
      params.set('tab', nextTab);
    }

    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
        <div>
          <p className="text-sm font-semibold">Status da cantina</p>
          <p className="text-xs text-muted-foreground">{canteenStatus.isOpen ? 'Recebendo pedidos e vendas.' : 'No momento não está recebendo novos pedidos.'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={canteenStatus.isOpen ? 'success' : 'secondary'}>{canteenStatus.isOpen ? 'Aberta' : 'Fechada'}</Badge>
          {canOperate ? <Button size="sm" variant={canteenStatus.isOpen ? 'outline' : 'default'} onClick={() => void toggleCanteen()} disabled={updatingStatus}>
            {updatingStatus ? 'Atualizando...' : canteenStatus.isOpen ? 'Fechar cantina' : 'Abrir cantina'}
          </Button> : null}
        </div>
      </div>
    {canOrder && !canSell ? <MemberOrderView /> : <Tabs defaultValue={firstAvailableTab} value={activeTab} onValueChange={handleTabChange} className="space-y-4">
      <TabsList className="grid h-auto w-full grid-flow-col auto-cols-max gap-1 overflow-x-auto p-1 md:grid-cols-6 md:auto-cols-fr md:overflow-visible">
        {canSell ? <TabsTrigger value="pdv" className="min-w-[84px] shrink-0 gap-1.5 px-3 py-2 text-xs md:min-w-0 md:text-sm">
          <ShoppingCart className="w-4 h-4" />
          <span className="hidden sm:inline">PDV</span>
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

      {canSell ? <TabsContent value="pdv" className="mt-0"><PDV /></TabsContent> : null}
      {canOperate ? <TabsContent value="orders" className="mt-0"><MemberOrdersView /></TabsContent> : null}
      {canOperate ? <TabsContent value="prep" className="mt-0"><PreparoView /></TabsContent> : null}
      {canViewSales ? <TabsContent value="sales" className="mt-0"><SalesHistory /></TabsContent> : null}
      {canManageProducts ? <TabsContent value="products" className="mt-0"><ProductsManager /></TabsContent> : null}
      {canManageCanteen ? <TabsContent value="loyalty" className="mt-0"><LoyaltySettings /></TabsContent> : null}
    </Tabs>}
    </div>
  );
}
