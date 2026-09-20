import { describe, expect, it, vi } from 'vitest';
import { GroupsPolicy } from '@/server/groups/groups.policy';
import { GroupsService } from '@/server/groups/groups.service';
import type { GroupsRepository } from '@/server/groups/groups.repository';

const viewer = { role: 'MEMBER', permissions: ['groups:view'], planFeatures: ['groups'] };
const creator = { role: 'MEMBER', permissions: ['groups:create'], planFeatures: ['groups'] };
const withoutAccess = { role: 'MEMBER', permissions: [], planFeatures: ['groups'] };

function repositoryMock() {
  return {
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockImplementation(async (data) => ({ success: true, id: data.id })),
  } as unknown as GroupsRepository;
}

describe('camadas de grupos', () => {
  it('separa autorização de leitura e criação', () => {
    expect(() => GroupsPolicy.assertView(viewer)).not.toThrow();
    expect(() => GroupsPolicy.assertCreate(creator)).not.toThrow();
    expect(() => GroupsPolicy.assertCreate(viewer)).toThrow('criar grupos');
    expect(() => GroupsPolicy.assertView(withoutAccess)).toThrow('consultar grupos');
  });

  it('normaliza o grupo e seus membros antes de persistir', async () => {
    const repository = repositoryMock();
    const service = new GroupsService(repository);

    const result = await service.create({
      name: '  Grupo de Jovens  ',
      description: '  Encontros semanais ',
      type: 'ministry',
      color: ' blue ',
      icon: ' users ',
      capabilities: ['fundraising', 'fundraising', 'events'],
      members: [
        { memberId: 'member-1', role: 'leader' },
        { memberId: '', role: 'member' },
      ],
    });

    expect(result).toMatchObject({ success: true });
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Grupo de Jovens',
      description: 'Encontros semanais',
      color: 'blue',
      icon: 'users',
      capabilities: ['fundraising', 'fundraising', 'events'],
      members: [{ memberId: 'member-1', role: 'leader' }],
    }));
  });

  it('rejeita grupo sem nome', () => {
    const service = new GroupsService(repositoryMock());
    expect(() => service.create({ name: '   ' })).toThrow('Nome é obrigatório');
  });
});
