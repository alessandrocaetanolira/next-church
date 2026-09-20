import { describe, expect, it, vi } from 'vitest';
import { ParkingPolicy } from '@/server/parking/parking.policy';
import { ParkingService } from '@/server/parking/parking.service';
import type { ParkingRepository } from '@/server/parking/parking.repository';

const manager = { role: 'LEADER', permissions: ['parking:view', 'parking:create', 'parking:update', 'parking:delete'], planFeatures: ['parking'] };
const viewer = { role: 'MEMBER', permissions: ['parking:view'], planFeatures: ['parking'] };

function repositoryMock(overrides: Partial<Record<keyof ParkingRepository, unknown>> = {}) {
  return {
    list: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue({ id: 'spot-1', occupiedByMemberId: 'member-1', label: 'A1' }),
    create: vi.fn().mockResolvedValue({ id: 'spot-1' }),
    update: vi.fn().mockResolvedValue({ id: 'spot-1' }),
    updateStatus: vi.fn().mockResolvedValue({ id: 'spot-1' }),
    remove: vi.fn().mockResolvedValue({ success: true }),
    ...overrides,
  } as unknown as ParkingRepository;
}

describe('camadas do estacionamento', () => {
  it('separa consulta e gerenciamento por perfil', () => {
    expect(() => ParkingPolicy.assertView(viewer)).not.toThrow();
    expect(() => ParkingPolicy.assertManage(manager, 'create')).not.toThrow();
    expect(() => ParkingPolicy.assertManage(viewer, 'update')).toThrow('gerenciar');
  });

  it('normaliza e cria uma vaga', async () => {
    const repository = repositoryMock();
    const service = new ParkingService(repository, {} as never, 'tenant-1');

    await service.create({ groupId: ' group-1 ', label: ' A1 ', status: 'free', notes: '  Coberta ' });

    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ groupId: 'group-1', label: 'A1', notes: 'Coberta', status: 'free' }));
  });

  it('valida existência para atualização e exclusão', async () => {
    const repository = repositoryMock({ findById: vi.fn().mockResolvedValue(null) });
    const service = new ParkingService(repository, {} as never, 'tenant-1');

    await expect(service.update('missing', {})).rejects.toThrow('não encontrada');
    await expect(service.remove('missing')).rejects.toThrow('não encontrada');
  });

  it('exige ocupante para enviar aviso', async () => {
    const repository = repositoryMock({ findById: vi.fn().mockResolvedValue({ id: 'spot-1', occupiedByMemberId: null }) });
    const service = new ParkingService(repository, {} as never, 'tenant-1');

    await expect(service.notify('spot-1', { title: 'Aviso', message: 'Mova o carro' }, 'Equipe')).rejects.toThrow('membro vinculado');
  });
});
