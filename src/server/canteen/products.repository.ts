import type { TenantDatabase } from '@/infra/database/tenant-transaction';

export class CanteenProductsRepository {
  constructor(private readonly prisma: TenantDatabase) {}

  list() {
    return this.prisma.product.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' } });
  }

  /** Histórico completo do período no banco do tenant, não a lista operacional limitada a 50 vendas.
   * Arquivar um pedido pronto não desfaz a venda; por isso deletedAt não exclui seu histórico. */
  listConfirmedSaleItems(from: Date, to: Date) {
    return this.prisma.sale.findMany({
      where: {
        createdAt: { gte: from, lte: to },
        paymentMethod: { notIn: ['pending', 'cancelled'] },
        OR: [{ orderStatus: null }, { orderStatus: { not: 'cancelled' } }],
      },
      select: { items: true },
    });
  }

  findById(id: string) {
    return this.prisma.product.findFirst({ where: { id, deletedAt: null } });
  }

  create(data: {
    id: string; name: string; description: string | null; imageUrl: string | null;
    price: number; cost: number; stock: number; minStock: number; category: string;
    active: boolean; availableToday: boolean;
  }) {
    return this.prisma.product.create({ data });
  }

  update(id: string, data: {
    name?: string; description?: string | null; imageUrl?: string | null; price?: number;
    cost?: number; stock?: number; minStock?: number; category?: string; active?: boolean; availableToday?: boolean;
  }) {
    return this.prisma.product.update({ where: { id }, data });
  }

  softDelete(id: string) {
    return this.prisma.product.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
