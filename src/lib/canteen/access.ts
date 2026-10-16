import { hasActionPermission, hasAnyActionPermission } from '@/lib/access-control';

type CanteenUser = Parameters<typeof hasActionPermission>[0];
export type CanteenOperationalTab = 'orders' | 'prep' | 'products' | 'sales' | 'loyalty';
export type CanteenView = CanteenOperationalTab | 'cart' | 'catalog' | 'none';

/** Capacidades compartilhadas entre navegação e policies, sem conceder acesso pelo nome do perfil. */
export function getCanteenAccess(user: CanteenUser) {
  const canBrowse = hasAnyActionPermission(user, 'canteen', ['view', 'catalog', 'order']);
  const canOrder = hasActionPermission(user, 'canteen', 'order');
  const canSell = hasActionPermission(user, 'canteen', 'sell');
  const canOperate = hasActionPermission(user, 'canteen', 'operate');
  const canManageProducts = hasActionPermission(user, 'canteen', 'manage_products');
  const canManage = hasActionPermission(user, 'canteen', 'manage');
  // `view` também faz parte do preset do comprador; sozinho não abre vendas de terceiros.
  const canViewSales = hasActionPermission(user, 'canteen', 'view')
    && hasAnyActionPermission(user, 'canteen', ['sell', 'operate', 'manage', 'export']);
  const operationalTabs: CanteenOperationalTab[] = [];
  if (canOperate) operationalTabs.push('orders', 'prep');
  if (canManageProducts) operationalTabs.push('products');
  if (canViewSales) operationalTabs.push('sales');
  if (canManage) operationalTabs.push('loyalty');
  return { canBrowse, canOrder, canSell, canOperate, canManageProducts, canManage, canViewSales, operationalTabs, canUseCart: canOrder || canSell };
}

/** Recalcula a visualização permitida, inclusive quando perfil/permissões mudam por SSE. */
export function resolveCanteenView(user: CanteenUser, requested: string | null | undefined): CanteenView {
  const access = getCanteenAccess(user);
  if (['cart', 'buy', 'pdv'].includes(requested ?? '') && access.canUseCart) return 'cart';
  if (access.operationalTabs.includes(requested as CanteenOperationalTab)) return requested as CanteenOperationalTab;
  return access.canUseCart ? 'cart' : access.operationalTabs[0] ?? (access.canBrowse ? 'catalog' : 'none');
}
