import type { PrismaClient as TenantPrismaClient } from '@/generated/prisma-tenant';
import { generateId } from '@/lib/id';

export type LedgerRow = {
  id: string; memberId: string; memberName: string | null; type: string; amount: number;
  saleId: string | null; notes: string | null; createdBy: string | null; createdAt: Date; updatedAt: Date; deletedAt: Date | null;
};

export class CanteenLedgerRepository {
  constructor(private readonly prisma: TenantPrismaClient) {}

  async findMemberLedger(memberId: string) {
    const member = await this.prisma.member.findFirst({ where: { id: memberId, deletedAt: null } });
    if (!member) return null;
    const entries = await this.prisma.$queryRawUnsafe<LedgerRow[]>(
      `SELECT id, memberId, memberName, type, amount, saleId, notes, createdBy, createdAt, updatedAt, deletedAt
       FROM "CreditTransaction" WHERE memberId = ? AND deletedAt IS NULL ORDER BY createdAt DESC`, memberId,
    );
    return { member, entries };
  }

  async registerPayment(memberId: string, amount: number, createdBy: string) {
    return this.prisma.$transaction(async (tx) => {
      const member = await tx.member.findFirst({ where: { id: memberId, deletedAt: null } });
      if (!member) return null;
      const updatedMember = await tx.member.update({ where: { id: memberId }, data: { creditBalance: { decrement: amount } } });
      const now = new Date().toISOString();
      await tx.$executeRawUnsafe(
        `INSERT INTO "CreditTransaction" (id, memberId, memberName, type, amount, notes, createdBy, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        generateId(), memberId, updatedMember.name, 'payment', amount, 'Pagamento manual', createdBy, now, now,
      );
      return updatedMember;
    });
  }
}
