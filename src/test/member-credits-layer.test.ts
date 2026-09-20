import { describe, expect, it, vi } from 'vitest';
import { MemberCreditsPolicy } from '@/server/member-credits/member-credits.policy';
import { MemberCreditsService } from '@/server/member-credits/member-credits.service';
import type { MemberCreditsRepository } from '@/server/member-credits/member-credits.repository';

const operator = { role: 'ADMIN', permissions: ['canteen:operate'], planFeatures: ['canteen'] };
const withoutAccess = { role: 'MEMBER', permissions: [], planFeatures: ['canteen'] };

function repositoryMock() {
  return {
    updateBalance: vi.fn().mockResolvedValue({ id: 'member-1', creditBalance: 20 }),
  } as unknown as MemberCreditsRepository;
}

describe('camadas de créditos de membros', () => {
  it('protege a sincronização por permissão', () => {
    expect(() => MemberCreditsPolicy.assertSync(operator)).not.toThrow();
    expect(() => MemberCreditsPolicy.assertSync(withoutAccess)).toThrow('créditos');
  });

  it('registra pagamento com valor e responsável', async () => {
    const repository = repositoryMock();
    const service = new MemberCreditsService(repository);

    const result = await service.sync({ id: 'member-1', amount: 10, memberName: 'João' }, 'admin@test.local');

    expect(result).toMatchObject({ success: true, memberId: 'member-1' });
    expect(repository.updateBalance).toHaveBeenCalledWith('member-1', null, { amount: 10, memberName: 'João', createdBy: 'admin@test.local' });
  });

  it('permite sincronizar saldo absoluto quando não há pagamento', async () => {
    const repository = repositoryMock();
    const service = new MemberCreditsService(repository);

    await service.sync({ id: 'member-1', creditBalance: 35 }, 'Sistema');

    expect(repository.updateBalance).toHaveBeenCalledWith('member-1', 35, null);
  });

  it('rejeita payload sem membro ou valor inválido', async () => {
    const service = new MemberCreditsService(repositoryMock());

    await expect(service.sync({ amount: 10 }, 'Sistema')).rejects.toThrow('Identificador');
    await expect(service.sync({ id: 'member-1', amount: -1 }, 'Sistema')).rejects.toThrow('Valor inválido');
  });
});
