import type { PrismaClient as TenantPrismaClient } from '@/generated/prisma-tenant';
import { generateId } from '@/lib/id';

export type SaleItem = { productId?: string; name: string; quantity: number; price: number };
export type SaleRecord = {
  id: string; total: number; paymentMethod: string; orderStatus: string | null; items: string;
  memberId: string | null; memberName: string | null; createdBy: string; createdAt: Date; updatedAt: Date; deletedAt: Date | null;
};

export function parseSale(sale: SaleRecord) {
  return {
    ...sale,
    items: JSON.parse(sale.items || '[]'),
    createdAt: sale.createdAt.toISOString(),
    updatedAt: sale.updatedAt.toISOString(),
    deletedAt: sale.deletedAt?.toISOString() ?? null,
  };
}

export class CanteenSalesRepository {
  constructor(private readonly prisma: TenantPrismaClient) {}

  async list() {
    const sales = await this.prisma.$queryRawUnsafe<SaleRecord[]>(`
      SELECT id, total, paymentMethod, orderStatus, items, memberId, memberName, createdBy, createdAt, updatedAt, deletedAt
      FROM "Sale" WHERE deletedAt IS NULL ORDER BY createdAt DESC LIMIT 50
    `);
    return sales.map(parseSale);
  }

  async create(data: {
    id?: string; total: number; paymentMethod: string; orderStatus: string | null;
    items: SaleItem[]; memberId: string | null; memberName: string | null; createdBy: string; createdAt?: Date;
  }) {
    const result = await this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          ...(data.id ? { id: data.id } : {}),
          total: data.total,
          paymentMethod: data.paymentMethod,
          items: JSON.stringify(data.items),
          memberId: data.memberId,
          memberName: data.memberName,
          createdBy: data.createdBy,
          ...(data.createdAt ? { createdAt: data.createdAt } : {}),
        },
      });

      await tx.$executeRawUnsafe(
        `UPDATE "Sale" SET "orderStatus" = ?, "updatedAt" = ? WHERE id = ?`,
        data.orderStatus,
        new Date().toISOString(),
        sale.id,
      );

      if (data.paymentMethod !== 'pending') {
        for (const item of data.items) {
          if (!item.productId || item.quantity <= 0) continue;
          await tx.product.update({ where: { id: item.productId }, data: { stock: { decrement: item.quantity } } });
        }
      }

      if (data.paymentMethod === 'fiado' && data.memberId) {
        await tx.member.update({ where: { id: data.memberId }, data: { creditBalance: { increment: data.total } } });
        await tx.$executeRawUnsafe(
          `INSERT INTO "CreditTransaction" (id, memberId, memberName, type, amount, saleId, notes, createdBy, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          generateId(), data.memberId, data.memberName, 'debit', data.total, sale.id,
          'Venda em fiado', data.createdBy, data.createdAt?.toISOString() ?? new Date().toISOString(), new Date().toISOString(),
        );
      }

      const [createdSale] = await tx.$queryRawUnsafe<SaleRecord[]>(
        `SELECT id, total, paymentMethod, orderStatus, items, memberId, memberName, createdBy, createdAt, updatedAt, deletedAt
         FROM "Sale" WHERE id = ? LIMIT 1`, sale.id,
      );
      return createdSale;
    });

    return parseSale(result);
  }

  findById(id: string) {
    return this.prisma.$queryRawUnsafe<SaleRecord[]>(
      `SELECT id, total, paymentMethod, orderStatus, items, memberId, memberName, createdBy, createdAt, updatedAt, deletedAt
       FROM "Sale" WHERE id = ? LIMIT 1`, id,
    ).then(([sale]) => sale ?? null);
  }

  async reject(id: string) {
    await this.prisma.$executeRawUnsafe(`UPDATE "Sale" SET "paymentMethod" = ?, "orderStatus" = ?, "updatedAt" = ? WHERE id = ?`, 'cancelled', 'cancelled', new Date().toISOString(), id);
    return this.findById(id);
  }

  async updateStatus(id: string, orderStatus: string) {
    await this.prisma.$executeRawUnsafe(`UPDATE "Sale" SET "orderStatus" = ?, "updatedAt" = ? WHERE id = ?`, orderStatus, new Date().toISOString(), id);
    return this.findById(id);
  }

  async approve(id: string, paymentMethod: string, createdBy: string) {
    const sale = await this.findById(id);
    if (!sale) return null;
    const items = JSON.parse(sale.items || '[]') as Array<{ productId?: string; quantity?: number }>;

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`UPDATE "Sale" SET "paymentMethod" = ?, "orderStatus" = ?, "updatedAt" = ? WHERE id = ?`, paymentMethod, 'preparing', new Date().toISOString(), id);
      for (const item of items) {
        if (item.productId && item.quantity) await tx.product.update({ where: { id: item.productId }, data: { stock: { decrement: item.quantity } } });
      }
      if (paymentMethod === 'fiado' && sale.memberId) {
        await tx.member.update({ where: { id: sale.memberId }, data: { creditBalance: { increment: sale.total } } });
        const now = new Date().toISOString();
        await tx.$executeRawUnsafe(
          `INSERT INTO "CreditTransaction" (id, memberId, memberName, type, amount, saleId, notes, createdBy, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          generateId(), sale.memberId, sale.memberName, 'debit', sale.total, sale.id, 'Pedido aprovado em fiado', createdBy, now, now,
        );
      }
      const [updated] = await tx.$queryRawUnsafe<SaleRecord[]>(
        `SELECT id, total, paymentMethod, orderStatus, items, memberId, memberName, createdBy, createdAt, updatedAt, deletedAt
         FROM "Sale" WHERE id = ? LIMIT 1`, id,
      );
      return updated ?? null;
    });
  }
}
