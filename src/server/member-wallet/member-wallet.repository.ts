import type { PrismaClient as TenantPrismaClient } from '@/generated/prisma-tenant';

export type WalletLedgerRow = {
  id: string;
  type: string;
  amount: number;
  saleId: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: Date;
};

type LedgerCursor = { createdAt: Date; id: string };

export class MemberWalletRepository {
  constructor(private readonly prisma: TenantPrismaClient) {}

  findMember(identity: { linkedMemberId?: string | null; email?: string | null }) {
    const memberId = identity.linkedMemberId?.trim();
    if (memberId) return this.prisma.member.findFirst({ where: { id: memberId, deletedAt: null } });
    const email = identity.email?.trim().toLowerCase();
    if (!email) return Promise.resolve(null);
    return this.prisma.member.findFirst({ where: { email, deletedAt: null } });
  }

  listSales(memberId: string) {
    return this.prisma.sale.findMany({
      where: { memberId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  listLedger(memberId: string, input: { cursor?: LedgerCursor | null; take?: number } = {}) {
    const take = Math.min(Math.max(input.take ?? 20, 1), 50);
    const cursor = input.cursor;
    const cursorSql = cursor
      ? 'AND (createdAt < ? OR (createdAt = ? AND id < ?))'
      : '';
    return this.prisma.$queryRawUnsafe<WalletLedgerRow[]>(
      `SELECT id, type, amount, saleId, notes, createdBy, createdAt
       FROM "CreditTransaction"
       WHERE memberId = ? AND deletedAt IS NULL ${cursorSql}
       ORDER BY createdAt DESC, id DESC
       LIMIT ?`,
      memberId,
      ...(cursor ? [cursor.createdAt.toISOString(), cursor.createdAt.toISOString(), cursor.id] : []),
      take,
    );
  }

  async getLedgerTotals(memberId: string) {
    const [result] = await this.prisma.$queryRawUnsafe<Array<{ debits: number | null; payments: number | null }>>(
      `SELECT
         COALESCE(SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END), 0) AS debits,
         COALESCE(SUM(CASE WHEN type = 'payment' THEN amount ELSE 0 END), 0) AS payments
       FROM "CreditTransaction"
       WHERE memberId = ? AND deletedAt IS NULL`,
      memberId,
    );
    return { debits: Number(result?.debits ?? 0), payments: Number(result?.payments ?? 0) };
  }
}
