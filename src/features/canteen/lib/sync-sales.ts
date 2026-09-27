import { db, type LocalSale } from '@/lib/db';
import { fetchCanteenSales } from '@/services/sync/sync-api';

type RemoteSale = {
  id: string;
  total: number;
  paymentMethod: string;
  orderStatus?: 'pending' | 'preparing' | 'ready' | 'cancelled' | null;
  items: Array<{
    productId?: string;
    name: string;
    quantity: number;
    price: number;
  }>;
  memberId?: string | null;
  memberName?: string | null;
  createdBy: string;
  createdAt: string;
  deletedAt?: string | null;
};

function toLocalSale(sale: RemoteSale, tenantId?: string): LocalSale {
  return {
    id: sale.id,
    total: sale.total,
    paymentMethod: sale.paymentMethod,
    orderStatus: sale.orderStatus ?? undefined,
    items: sale.items.map((item) => ({
      productId: item.productId ?? '',
      name: item.name,
      quantity: item.quantity,
      price: item.price,
    })),
    memberId: sale.memberId ?? undefined,
    memberName: sale.memberName ?? undefined,
    createdBy: sale.createdBy,
    createdAt: sale.createdAt,
    tenantId,
    _status: 'synced',
  };
}

export async function syncCanteenSalesFromServer(tenantId?: string) {
  const response = await fetchCanteenSales<RemoteSale[]>();
  if (!response.ok) {
    throw new Error('Falha ao buscar vendas da cantina');
  }

  const sales = response.data ?? [];
  const normalized = Array.isArray(sales) ? sales.map((sale) => toLocalSale(sale, tenantId)) : [];
  const remoteIds = new Set(normalized.map((sale) => sale.id));
  const localSales = await db.sales.toArray();
  const staleSyncedIds = localSales
    .filter((sale) => sale.tenantId === tenantId && sale._status !== 'pending' && sale._status !== 'error' && !remoteIds.has(sale.id))
    .map((sale) => sale.id);

  if (staleSyncedIds.length > 0) await db.sales.bulkDelete(staleSyncedIds);

  const deletedIds = Array.isArray(sales)
    ? sales.filter((sale) => sale.deletedAt).map((sale) => sale.id)
    : [];
  if (deletedIds.length > 0) await db.sales.bulkDelete(deletedIds);

  await db.sales.bulkPut(normalized.filter((sale) => !sales.find((remote) => remote.id === sale.id && remote.deletedAt)));

  return normalized;
}
