import { generateId } from '@/lib/id';
import { inTenantTransaction, type TenantDatabase } from '@/infra/database/tenant-transaction';
import { ConflictError } from '@/lib/http/errors';

export class MemberCreditsRepository {
  constructor(private readonly prisma: TenantDatabase) {}

  async updateBalance(memberId: string, creditBalance: number | null, payment: { amount: number; memberName?: string | null; createdBy: string } | null) {
    return inTenantTransaction(this.prisma, async (tx) => {
      const member = await tx.member.findFirst({ where: { id: memberId, deletedAt: null } });
      if (!member) return null;
      if (payment && payment.amount > member.creditBalance) throw new ConflictError('O pagamento é maior que o saldo devedor.');
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
