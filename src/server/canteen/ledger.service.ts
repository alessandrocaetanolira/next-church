import { ValidationError, NotFoundError } from '@/lib/http/errors';
import { CanteenLedgerRepository } from './ledger.repository';

export class CanteenLedgerService {
  constructor(private readonly repository: CanteenLedgerRepository) {}

  async get(memberId: string) {
    const result = await this.repository.findMemberLedger(memberId);
    if (!result) throw new NotFoundError('Membro não encontrado.');
    const totals = result.entries.reduce((acc, entry) => {
      if (entry.type === 'debit') acc.debits += entry.amount;
      if (entry.type === 'payment') acc.payments += entry.amount;
      return acc;
    }, { debits: 0, payments: 0 });

    return {
      member: { ...result.member, createdAt: result.member.createdAt.toISOString(), updatedAt: result.member.updatedAt.toISOString(), deletedAt: null },
      summary: { debits: totals.debits, payments: totals.payments, balance: result.member.creditBalance ?? 0 },
      entries: result.entries.map((entry) => ({ ...entry, createdAt: entry.createdAt.toISOString(), updatedAt: entry.updatedAt.toISOString(), deletedAt: entry.deletedAt?.toISOString() ?? null })),
    };
  }

  async payment(memberId: string, input: unknown, createdBy: string) {
    const amount = Number((input as { amount?: unknown } | null)?.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new ValidationError('Valor inválido.');
    const current = await this.repository.findMemberLedger(memberId);
    if (!current) throw new NotFoundError('Membro não encontrado.');
    if (amount > (current.member.creditBalance ?? 0)) throw new ValidationError('Valor maior que a dívida.');
    const member = await this.repository.registerPayment(memberId, amount, createdBy);
    if (!member) throw new NotFoundError('Membro não encontrado.');
    return { member: { ...member, createdAt: member.createdAt.toISOString(), updatedAt: member.updatedAt.toISOString(), deletedAt: null } };
  }
}
