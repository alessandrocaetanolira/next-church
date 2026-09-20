import { NotFoundError, ValidationError } from '@/lib/http/errors';
import { MemberCreditsRepository } from './member-credits.repository';

export class MemberCreditsService {
  constructor(private readonly repository: MemberCreditsRepository) {}

  async sync(input: unknown, createdBy: string) {
    const body = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
    const memberId = typeof body.id === 'string' ? body.id.trim() : '';
    if (!memberId) throw new ValidationError('Identificador do membro é obrigatório.');
    const amount = typeof body.amount === 'number' ? body.amount : null;
    if (amount !== null && (!Number.isFinite(amount) || amount <= 0)) throw new ValidationError('Valor inválido.');
    const result = await this.repository.updateBalance(memberId, typeof body.creditBalance === 'number' && Number.isFinite(body.creditBalance) ? body.creditBalance : null, amount ? { amount, memberName: typeof body.memberName === 'string' ? body.memberName : null, createdBy } : null);
    if (!result) throw new NotFoundError('Membro não encontrado.');
    return { success: true, memberId: result.id, creditBalance: result.creditBalance };
  }
}
