import { describe, expect, it, vi } from 'vitest';
import { KidsPolicy } from '@/server/kids/kids.policy';
import { KidsService } from '@/server/kids/kids.service';
import type { KidsRepository } from '@/server/kids/kids.repository';

vi.mock('@/lib/server/notification-service', () => ({ notifyChildResponsibles: vi.fn().mockResolvedValue(undefined) }));

const manager = { role: 'LEADER', permissions: ['kids:view', 'kids:create', 'kids:update', 'kids:delete'], planFeatures: ['kids'] };
const viewer = { role: 'MEMBER', permissions: ['kids:view'], planFeatures: ['kids'] };

function repositoryMock(overrides: Partial<Record<keyof KidsRepository, unknown>> = {}) {
  return {
    list: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue({ id: 'child-1', name: 'Ana', parentMemberIds: JSON.stringify(['member-1']), groupIds: '[]' }),
    create: vi.fn().mockResolvedValue({ id: 'child-1', name: 'Ana', parentMemberIds: '[]', groupIds: '[]' }),
    update: vi.fn().mockResolvedValue({ id: 'child-1', name: 'Ana', parentMemberIds: '[]', groupIds: '[]' }),
    remove: vi.fn().mockResolvedValue({ success: true }),
    ...overrides,
  } as unknown as KidsRepository;
}

describe('camadas do Infantil', () => {
  it('separa consulta e gerenciamento', () => {
    expect(() => KidsPolicy.assertView(viewer)).not.toThrow();
    expect(() => KidsPolicy.assertManage(manager, 'create')).not.toThrow();
    expect(() => KidsPolicy.assertManage(viewer, 'update')).toThrow('gerenciar');
  });

  it('normaliza cadastro, responsáveis e grupos', async () => {
    const repository = repositoryMock();
    const service = new KidsService(repository, {} as never, 'tenant-1');

    await service.create({ name: '  Ana  ', birthDate: '2020-05-10', parentMemberIds: ['member-1', 'member-1', ''], groupIds: ['group-1'], allergies: '  Poeira ' });

    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Ana', parentMemberIds: ['member-1', 'member-1'], groupIds: ['group-1'], allergies: 'Poeira', canDoPhysicalActivities: true }));
  });

  it('exige nome e valida a criança antes de alterar', async () => {
    const service = new KidsService(repositoryMock({ findById: vi.fn().mockResolvedValue(null) }), {} as never, 'tenant-1');

    await expect(service.create({ name: '' })).rejects.toThrow('Nome da criança');
    await expect(service.update('missing', { name: 'Ana' })).rejects.toThrow('não encontrada');
  });

  it('não notifica criança sem responsável', async () => {
    const repository = repositoryMock({ findById: vi.fn().mockResolvedValue({ id: 'child-1', name: 'Ana', parentMemberIds: '[]' }) });
    const service = new KidsService(repository, {} as never, 'tenant-1');

    await expect(service.notify('child-1', { title: 'Aviso', message: 'Mensagem' }, 'Equipe')).rejects.toThrow('responsável');
  });
});
