import { NotFoundError, ValidationError } from '@/lib/http/errors';
import { MemberCreditsRepository } from './member-credits.repository';

export class MemberCreditsService {
  constructor(private readonly repository: MemberCreditsRepository) {}

  async sync(input: unknown, createdBy: string) {
    const body = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
    const memberId = typeof body.id === 'string' ? body.id.trim() : '';
    if (!memberId) throw new ValidationError('Identificador do membro é obrigatório.');
    const amount = typeof body.amount === 'number' ? body.amount : null;
    const balance = typeof body.creditBalance === 'number' ? body.creditBalance : null;
    const cents = (value: number) => Number.isFinite(value) && Number.isSafeInteger(Math.round(value * 100)) && Math.abs(Math.round(value * 100) - value * 100) < 0.000001;
    if ((body.amount !== undefined && (amount === null || amount <= 0 || !cents(amount)))
      || (body.creditBalance !== undefined && (balance === null || balance < 0 || !cents(balance)))
      || (amount === null && balance === null) || (amount !== null && balance !== null)) throw new ValidationError('Valor inválido. Informe pagamento ou saldo, com até duas casas decimais.');
    const result = await this.repository.updateBalance(memberId, balance, amount !== null ? { amount, memberName: typeof body.memberName === 'string' ? body.memberName : null, createdBy } : null);
    if (!result) throw new NotFoundError('Membro não encontrado.');
    return { success: true, memberId: result.id, creditBalance: result.creditBalance };
  }
}
