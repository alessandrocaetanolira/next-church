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
};

function toLocalSale(sale: RemoteSale): LocalSale {
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
    _status: 'synced',
  };
}

export async function syncCanteenSalesFromServer() {
  const response = await fetchCanteenSales<RemoteSale[]>();
  if (!response.ok) {
    throw new Error('Falha ao buscar vendas da cantina');
  }

  const sales = response.data ?? [];
  const normalized = Array.isArray(sales) ? sales.map(toLocalSale) : [];

  await db.sales.bulkPut(normalized);

  return normalized;
}
