import type { PrismaClient as TenantPrismaClient } from '@/generated/prisma-tenant';
import { generateId } from '@/lib/id';

export class MemberCreditsRepository {
  constructor(private readonly prisma: TenantPrismaClient) {}

  async updateBalance(memberId: string, creditBalance: number | null, payment: { amount: number; memberName?: string | null; createdBy: string } | null) {
    return this.prisma.$transaction(async (tx) => {
      const member = await tx.member.findFirst({ where: { id: memberId, deletedAt: null } });
      if (!member) return null;
      const updated = payment
        ? await tx.member.update({ where: { id: memberId }, data: { creditBalance: { decrement: payment.amount } } })
        : await tx.member.update({ where: { id: memberId }, data: { creditBalance: creditBalance ?? 0 } });
      if (payment) {
        const now = new Date().toISOString();
        await tx.$executeRawUnsafe(`INSERT INTO "CreditTransaction" (id, memberId, memberName, type, amount, notes, createdBy, createdAt, updatedAt) VALUES (?, ?, ?, 'payment', ?, ?, ?, ?, ?)`, generateId(), memberId, payment.memberName ?? updated.name, payment.amount, 'Pagamento sincronizado', payment.createdBy, now, now);
      }
      return updated;
    });
  }
}
