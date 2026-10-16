import type { Prisma } from '@/generated/prisma-tenant';
import { generateId } from '@/lib/id';
import { ConflictError } from '@/lib/http/errors';
import { assertSalePaymentMethod, normalizeSaleItems, validateSaleProducts, type ValidatedSaleItem } from './sale-rules';
import { inTenantTransaction, type TenantDatabase } from '@/infra/database/tenant-transaction';

export type SaleItem = { productId?: string; name: string; quantity: number; price: number };
export type SaleRecord = {
  id: string; total: number; paymentMethod: string; consumerType: string; orderStatus: string | null; items: string;
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
  constructor(private readonly prisma: TenantDatabase) {}

  /** Identidade de compra vem da sessão; não depende de membro previamente carregado no Dexie. */
  findPurchaser(memberId: string) {
    return this.prisma.member.findFirst({
      where: { id: memberId, active: true, approved: true, deletedAt: null },
      select: { id: true, name: true },
    });
  }

  async list() {
    const sales = await this.prisma.$queryRawUnsafe<SaleRecord[]>(`
      SELECT id, total, paymentMethod, consumerType, orderStatus, items, memberId, memberName, createdBy, createdAt, updatedAt, deletedAt
      FROM "Sale" WHERE deletedAt IS NULL ORDER BY createdAt DESC LIMIT 50
    `);
    return sales.map(parseSale);
  }

  async listChanges(since: Date, memberId?: string) {
    const sales = await this.prisma.sale.findMany({
      where: { updatedAt: { gt: since }, ...(memberId ? { memberId } : {}) },
      orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
    });
    return sales.map(parseSale);
  }

  async create(data: {
    id?: string; total: number; paymentMethod: string; consumerType?: string; orderStatus: string | null;
    items: SaleItem[]; memberId: string | null; memberName: string | null; createdBy: string; createdAt?: Date;
  }) {
    const result = await inTenantTransaction(this.prisma, async (tx) => {
      await this.assertOpen(tx);
      assertSalePaymentMethod(data.paymentMethod);
      const normalizedItems = normalizeSaleItems(data.items);
      const products = await tx.product.findMany({ where: { id: { in: normalizedItems.map((item) => item.productId) } } });
      const validated = validateSaleProducts(normalizedItems, data.total, products);
      if (data.memberId) {
        const member = await tx.member.findFirst({ where: { id: data.memberId, active: true, approved: true, deletedAt: null } });
        if (!member) throw new ConflictError('O membro do pedido não está ativo ou aprovado.');
      }
      const sale = await tx.sale.create({
        data: {
          ...(data.id ? { id: data.id } : {}),
          total: validated.total,
          paymentMethod: data.paymentMethod,
          items: JSON.stringify(validated.items),
          memberId: data.memberId,
          memberName: data.memberName,
          createdBy: data.createdBy,
          ...(data.createdAt ? { createdAt: data.createdAt } : {}),
        },
      });

      await tx.$executeRawUnsafe(
        `UPDATE "Sale" SET "consumerType" = ?, "orderStatus" = ?, "updatedAt" = ? WHERE id = ?`,
        data.consumerType ?? 'MEMBER',
        data.orderStatus,
        new Date().toISOString(),
        sale.id,
      );

      if (data.paymentMethod !== 'pending') {
        await this.decrementStock(tx, validated.items);
      }

      if (data.paymentMethod === 'fiado' && data.memberId) {
        await tx.member.update({ where: { id: data.memberId }, data: { creditBalance: { increment: validated.total } } });
        await tx.$executeRawUnsafe(
          `INSERT INTO "CreditTransaction" (id, memberId, memberName, type, amount, saleId, notes, createdBy, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          generateId(), data.memberId, data.memberName, 'debit', validated.total, sale.id,
          'Venda em fiado', data.createdBy, data.createdAt?.toISOString() ?? new Date().toISOString(), new Date().toISOString(),
        );
      }

      const [createdSale] = await tx.$queryRawUnsafe<SaleRecord[]>(
        `SELECT id, total, paymentMethod, consumerType, orderStatus, items, memberId, memberName, createdBy, createdAt, updatedAt, deletedAt
         FROM "Sale" WHERE id = ? LIMIT 1`, sale.id,
      );
      return createdSale;
    });

    return parseSale(result);
  }

  findById(id: string) {
    return this.prisma.$queryRawUnsafe<SaleRecord[]>(
      `SELECT id, total, paymentMethod, consumerType, orderStatus, items, memberId, memberName, createdBy, createdAt, updatedAt, deletedAt
       FROM "Sale" WHERE id = ? LIMIT 1`, id,
    ).then(([sale]) => sale ?? null);
  }

  async reject(id: string) {
    const sale = await this.findById(id);
    if (!sale) return null;
    if (sale.paymentMethod !== 'pending' || sale.orderStatus !== 'pending') {
      throw new ConflictError('Somente pedidos pendentes podem ser rejeitados.');
    }
    await this.prisma.$executeRawUnsafe(`UPDATE "Sale" SET "paymentMethod" = ?, "orderStatus" = ?, "updatedAt" = ? WHERE id = ?`, 'cancelled', 'cancelled', new Date().toISOString(), id);
    return this.findById(id);
  }

  async updateStatus(id: string, orderStatus: string) {
    const sale = await this.findById(id);
    if (!sale) return null;
    const validTransition = (sale.orderStatus === 'preparing' && ['ready', 'cancelled'].includes(orderStatus));
    if (!validTransition) throw new ConflictError('A transição de status do pedido não é válida.');
    await this.prisma.$executeRawUnsafe(`UPDATE "Sale" SET "orderStatus" = ?, "updatedAt" = ? WHERE id = ?`, orderStatus, new Date().toISOString(), id);
    return this.findById(id);
  }

  async archive(id: string) {
    await this.prisma.$executeRawUnsafe(`UPDATE "Sale" SET "deletedAt" = ?, "updatedAt" = ? WHERE id = ?`, new Date().toISOString(), new Date().toISOString(), id);
    return this.findById(id);
  }

  async approve(id: string, paymentMethod: string, createdBy: string) {
    const sale = await this.findById(id);
    if (!sale) return null;

    return inTenantTransaction(this.prisma, async (tx) => {
      await this.assertOpen(tx);
      assertSalePaymentMethod(paymentMethod, false);
      const current = await tx.sale.findUnique({ where: { id } });
      if (!current) return null;
      if (current.paymentMethod !== 'pending' || current.orderStatus !== 'pending') {
        throw new ConflictError('Somente pedidos pendentes podem ser aprovados.');
      }
      const items = normalizeSaleItems(JSON.parse(current.items || '[]'));
      const products = await tx.product.findMany({ where: { id: { in: items.map((item) => item.productId) } } });
      const validated = validateSaleProducts(items, current.total, products);
      if (current.memberId) {
        const member = await tx.member.findFirst({ where: { id: current.memberId, active: true, approved: true, deletedAt: null } });
        if (!member) throw new ConflictError('O membro do pedido não está ativo ou aprovado.');
      }
      await tx.$executeRawUnsafe(`UPDATE "Sale" SET "paymentMethod" = ?, "orderStatus" = ?, "updatedAt" = ? WHERE id = ?`, paymentMethod, 'preparing', new Date().toISOString(), id);
      await this.decrementStock(tx, validated.items);
      if (paymentMethod === 'fiado' && current.memberId) {
        await tx.member.update({ where: { id: current.memberId }, data: { creditBalance: { increment: current.total } } });
        const now = new Date().toISOString();
        await tx.$executeRawUnsafe(
          `INSERT INTO "CreditTransaction" (id, memberId, memberName, type, amount, saleId, notes, createdBy, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          generateId(), current.memberId, current.memberName, 'debit', current.total, current.id, 'Pedido aprovado em fiado', createdBy, now, now,
        );
      }
      const [updated] = await tx.$queryRawUnsafe<SaleRecord[]>(
        `SELECT id, total, paymentMethod, consumerType, orderStatus, items, memberId, memberName, createdBy, createdAt, updatedAt, deletedAt
         FROM "Sale" WHERE id = ? LIMIT 1`, id,
      );
      return updated ?? null;
    });
  }

  private async assertOpen(tx: Prisma.TransactionClient) {
    const settings = await tx.canteenSettings.findUnique({ where: { id: 'default' }, select: { isOpen: true } });
    if (!settings?.isOpen) throw new ConflictError('A cantina está fechada no momento.');
  }

  /** Guarda condicional na mesma transação da venda/fiado: duas vendas não podem consumir o mesmo saldo de estoque. */
  private async decrementStock(tx: Prisma.TransactionClient, items: ValidatedSaleItem[]) {
    for (const item of items) {
      const updated = await tx.product.updateMany({
        where: { id: item.productId, active: true, availableToday: true, deletedAt: null, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });
      if (updated.count !== 1) throw new ConflictError(`Estoque ou disponibilidade de ${item.name} foi alterado. Revise o pedido.`);
    }
  }
}
