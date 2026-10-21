import { beforeEach, describe, expect, it, vi } from 'vitest';

const { groupBy, getTenantClient } = vi.hoisted(() => ({ groupBy: vi.fn(), getTenantClient: vi.fn() }));
vi.mock('@/lib/prisma-factory', () => ({ getTenantClient }));
import { getTenantUserUsage } from '@/lib/tenant-user-usage';

beforeEach(() => {
  vi.resetAllMocks();
  getTenantClient.mockReturnValue({ user: { groupBy } });
});

describe('uso de usuários por igreja', () => {
  it('consulta a chave física após renomear o slug e exclui usuários removidos', async () => {
    groupBy.mockResolvedValue([{ active: true, _count: { _all: 7 } }, { active: false, _count: { _all: 2 } }]);
    await expect(getTenantUserUsage({ slug: 'nome-novo', databaseKey: 'nome-original' }, '/tmp/usage-test')).resolves.toEqual({ total: 9, active: 7, inactive: 2 });
    expect(getTenantClient).toHaveBeenCalledWith('nome-original', '/tmp/usage-test');
    expect(groupBy).toHaveBeenCalledWith({ by: ['active'], where: { deletedAt: null }, _count: { _all: true } });
  });

  it('usa o slug em registros antigos sem chave física', async () => {
    groupBy.mockResolvedValue([]);
    await expect(getTenantUserUsage({ slug: 'igreja-antiga', databaseKey: null })).resolves.toEqual({ total: 0, active: 0, inactive: 0 });
    expect(getTenantClient).toHaveBeenCalledWith('igreja-antiga', undefined);
  });

  it('contabiliza uma igreja que tenha somente usuários inativos', async () => {
    groupBy.mockResolvedValue([{ active: false, _count: { _all: 3 } }]);
    await expect(getTenantUserUsage({ slug: 'igreja', databaseKey: 'igreja' })).resolves.toEqual({ total: 3, active: 0, inactive: 3 });
  });

  it('distingue banco indisponível de uma igreja sem usuários', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      getTenantClient.mockImplementation(() => { throw new Error('Banco inexistente'); });
      await expect(getTenantUserUsage({ slug: 'igreja', databaseKey: 'igreja' })).resolves.toBeNull();
      expect(groupBy).not.toHaveBeenCalled();
      getTenantClient.mockReturnValue({ user: { groupBy } });
      groupBy.mockRejectedValue(new Error('Falha na consulta'));
      await expect(getTenantUserUsage({ slug: 'igreja', databaseKey: 'igreja' })).resolves.toBeNull();
    } finally {
      log.mockRestore();
    }
  });
});
