import { describe, expect, it, vi } from 'vitest';
import { PastoralPolicy } from '@/server/pastoral/pastoral.policy';
import { PastoralService } from '@/server/pastoral/pastoral.service';
import type { PastoralRepository } from '@/server/pastoral/pastoral.repository';

const pastor = { role: 'PASTOR', permissions: ['pastoral:view', 'members:approve', 'members:delete'], planFeatures: ['pastoral', 'members'] };
const member = { role: 'MEMBER', permissions: [], planFeatures: ['pastoral', 'members'] };

function repositoryMock(overrides: Partial<Record<keyof PastoralRepository, unknown>> = {}) {
  return {
    listPending: vi.fn().mockResolvedValue([]),
    findMemberForApproval: vi.fn().mockResolvedValue({ id: 'member-1', name: 'João', email: 'joao@test.local', passwordHash: 'hash' }),
    approve: vi.fn().mockResolvedValue({ id: 'member-1' }),
    reject: vi.fn().mockResolvedValue({ id: 'member-1' }),
    ...overrides,
  } as unknown as PastoralRepository;
}

describe('camadas pastorais', () => {
  it('restringe consulta e aprovação aos perfis autorizados', () => {
    expect(() => PastoralPolicy.assertView(pastor)).not.toThrow();
    expect(() => PastoralPolicy.assertApprove(pastor)).not.toThrow();
    expect(() => PastoralPolicy.assertReject(pastor)).not.toThrow();
    expect(() => PastoralPolicy.assertView(member)).toThrow('área pastoral');
    expect(() => PastoralPolicy.assertApprove(member)).toThrow('aprovar');
  });

  it('aprova membro usando o hash existente e cria acesso no repository', async () => {
    const repository = repositoryMock();
    const service = new PastoralService(repository);

    await expect(service.approve('member-1')).resolves.toEqual({ success: true });
    expect(repository.approve).toHaveBeenCalledWith('member-1', { name: 'João', email: 'joao@test.local', passwordHash: 'hash' });
  });

  it('impede aprovação sem senha e rejeita membro existente', async () => {
    const repository = repositoryMock({ findMemberForApproval: vi.fn().mockResolvedValueOnce({ id: 'member-1', name: 'João', email: 'joao@test.local', passwordHash: null }).mockResolvedValueOnce({ id: 'member-1', name: 'João', email: 'joao@test.local', passwordHash: 'hash' }) });
    const service = new PastoralService(repository);

    await expect(service.approve('member-1')).rejects.toThrow('senha válida');
    await expect(service.reject('member-1')).resolves.toEqual({ success: true });
    expect(repository.reject).toHaveBeenCalledWith('member-1');
  });
});
