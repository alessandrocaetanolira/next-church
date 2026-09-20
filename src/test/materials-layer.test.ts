import { describe, expect, it, vi } from 'vitest';
import { MaterialsPolicy } from '@/server/materials/materials.policy';
import { MaterialsService } from '@/server/materials/materials.service';
import type { MaterialsRepository } from '@/server/materials/materials.repository';

const manager = { role: 'MEMBER', permissions: ['materials:manage'] };
const viewer = { role: 'MEMBER', permissions: ['materials:view'] };
const withoutAccess = { role: 'MEMBER', permissions: [] };

function repositoryMock(overrides: Partial<Record<keyof MaterialsRepository, unknown>> = {}) {
  return {
    list: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue({ id: 'material-1', name: 'Cadeiras' }),
    create: vi.fn().mockImplementation(async (data) => ({ id: data.id, ...data })),
    update: vi.fn().mockImplementation(async (id, data) => ({ id, ...data })),
    softDelete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as MaterialsRepository;
}

describe('camadas de materiais', () => {
  it('permite leitura para view e administração para manage', () => {
    expect(() => MaterialsPolicy.assertView(viewer)).not.toThrow();
    expect(() => MaterialsPolicy.assertCreate(manager)).not.toThrow();
    expect(() => MaterialsPolicy.assertUpdate(manager)).not.toThrow();
    expect(() => MaterialsPolicy.assertDelete(manager)).not.toThrow();
  });

  it('bloqueia alterações sem permissão', () => {
    expect(() => MaterialsPolicy.assertView(withoutAccess)).toThrow('materiais');
    expect(() => MaterialsPolicy.assertCreate(viewer)).toThrow('criar');
    expect(() => MaterialsPolicy.assertDelete(viewer)).toThrow('excluir');
  });

  it('normaliza e cria um material', async () => {
    const repository = repositoryMock();
    const service = new MaterialsService(repository);

    const created = await service.create({ name: '  Cadeiras  ', category: 'Salão', quantity: '12.9', minQuantity: 3, unit: 'unidades' });

    expect(created).toMatchObject({ name: 'Cadeiras', category: 'Salão', quantity: 12, minQuantity: 3 });
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ quantity: 12, minQuantity: 3 }));
  });

  it('rejeita nome vazio e quantidade negativa', async () => {
    const service = new MaterialsService(repositoryMock());

    expect(() => service.create({ name: '', quantity: 1 })).toThrow('Nome é obrigatório');
    expect(() => service.create({ name: 'Cadeiras', quantity: -1 })).toThrow('maior ou igual a zero');
  });

  it('atualiza somente a quantidade pelo fluxo de estoque', async () => {
    const repository = repositoryMock();
    const service = new MaterialsService(repository);

    await service.updateQuantity('material-1', { quantity: '8.8' });

    expect(repository.update).toHaveBeenCalledWith('material-1', { quantity: 8 });
  });

  it('não atualiza nem exclui material inexistente', async () => {
    const repository = repositoryMock({ findById: vi.fn().mockResolvedValue(null) });
    const service = new MaterialsService(repository);

    await expect(service.updateQuantity('missing', { quantity: 2 })).rejects.toThrow('não encontrado');
    await expect(service.remove('missing')).rejects.toThrow('não encontrado');
    expect(repository.update).not.toHaveBeenCalled();
    expect(repository.softDelete).not.toHaveBeenCalled();
  });
});
