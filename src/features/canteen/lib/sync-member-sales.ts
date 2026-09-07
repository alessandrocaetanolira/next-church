import { db, type LocalMember, type LocalSale } from '@/lib/db';

type FinancialPayload = {
  member?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    creditBalance?: number;
  } | null;
  sales?: Array<{
    id: string;
    total: number;
    paymentMethod: string;
    orderStatus?: 'preparing' | 'ready' | 'cancelled' | null;
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
  }>;
};

function toLocalSale(sale: NonNullable<FinancialPayload['sales']>[number]): LocalSale {
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

export async function syncMemberSalesFromServer() {
  const response = await fetch('/api/members/me/financials', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Falha ao buscar movimentações do membro');
  }

  const payload = (await response.json()) as FinancialPayload;
  const sales = Array.isArray(payload.sales) ? payload.sales.map(toLocalSale) : [];
  await db.sales.bulkPut(sales);

  if (payload.member?.id) {
    const existing = await db.members.get(payload.member.id);
    const nextMember: LocalMember = {
      id: payload.member.id,
      name: payload.member.name,
      email: payload.member.email,
      phone: payload.member.phone,
      creditBalance: payload.member.creditBalance ?? 0,
      role: existing?.role ?? 'MEMBER',
      status: existing?.status ?? 'active',
      avatarUrl: existing?.avatarUrl,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: existing?.deletedAt,
      _status: 'synced',
    };

    await db.members.put(nextMember);
  }

  return payload;
}
