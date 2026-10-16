import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SyncPullService, type SyncUser } from '@/server/sync/sync-pull.service';
import type { SyncPullRepository } from '@/server/sync/sync-pull.repository';
import { pullSync } from '@/server/sync/sync-pull.controller';

const client = vi.hoisted(() => vi.fn());
vi.mock('@/lib/prisma-factory', () => ({ getTenantClient: client }));

const buyer: SyncUser = { id: 'user-a', email: 'a@test.local', tenantId: 'tenant-a', role: 'MEMBER', linkedMemberId: 'member-a',
  permissions: ['canteen:order'], planFeatures: ['offline_sync', 'canteen', 'tasks', 'members'] };
function repository() {
  return { sales: vi.fn().mockResolvedValue([]), products: vi.fn().mockResolvedValue([]),
    members: vi.fn().mockResolvedValue([]), tasks: vi.fn().mockResolvedValue([]), memberTeamIds: vi.fn().mockResolvedValue(['team-a']) };
}
beforeEach(() => vi.clearAllMocks());

describe('pull autorizado por módulo, vínculo e equipe', () => {
  it('comprador consulta somente vendas e membro próprios e catálogo sem custos', async () => {
    const repo = repository(); const since = new Date(0);
    await new SyncPullService(repo as unknown as SyncPullRepository).pull(buyer, since);
    expect(repo.sales).toHaveBeenCalledWith(since, expect.any(Date), 'member-a');
    expect(repo.members).toHaveBeenCalledWith(since, expect.any(Date), 'member-a', true);
    expect(repo.products).toHaveBeenCalledWith(since, expect.any(Date), false);
    expect(repo.tasks).not.toHaveBeenCalled(); expect(repo.memberTeamIds).not.toHaveBeenCalled();
  });

  it('offline_sync sozinho não concede leitura nem consulta dados de módulos', async () => {
    const repo = repository();
    const result = await new SyncPullService(repo as unknown as SyncPullRepository).pull({ ...buyer, permissions: [] }, new Date(0));
    expect(result).toMatchObject({ sales: [], products: [], members: [], tasks: [] });
    for (const method of Object.values(repo)) expect(method).not.toHaveBeenCalled();
  });

  it('sem vínculo não consulta vendas/membro próprios nem assume identidade por email', async () => {
    const repo = repository();
    await new SyncPullService(repo as unknown as SyncPullRepository).pull({ ...buyer, linkedMemberId: null }, new Date(0));
    expect(repo.sales).not.toHaveBeenCalled(); expect(repo.members).not.toHaveBeenCalled();
  });

  it('operate isolado não concede histórico de vendas sem a autorização de consulta', async () => {
    const repo = repository();
    await new SyncPullService(repo as unknown as SyncPullRepository).pull({ ...buyer, permissions: ['canteen:operate'] }, new Date(0));
    expect(repo.sales).not.toHaveBeenCalled();
  });

  it('líder lê somente equipes atuais do banco e não confia em teamIds antigos da sessão', async () => {
    const repo = repository();
    await new SyncPullService(repo as unknown as SyncPullRepository).pull({ ...buyer, role: 'LEADER', permissions: ['tasks:view'], teamIds: ['team-b'] }, new Date(0));
    expect(repo.memberTeamIds).toHaveBeenCalledWith('member-a');
    expect(repo.tasks).toHaveBeenCalledWith(expect.any(Date), expect.any(Date), ['team-a']);
  });

  it('sem equipe válida não faz consulta global de tarefas como fallback', async () => {
    const repo = repository(); repo.memberTeamIds.mockResolvedValue([]);
    await new SyncPullService(repo as unknown as SyncPullRepository).pull({ ...buyer, role: 'LEADER', permissions: ['tasks:view'] }, new Date(0));
    expect(repo.tasks).not.toHaveBeenCalled();
  });

  it('consulta de membros sem operação da cantina não inclui saldos de terceiros', async () => {
    const repo = repository();
    await new SyncPullService(repo as unknown as SyncPullRepository).pull({ ...buyer, permissions: ['members:view'] }, new Date(0));
    expect(repo.members).toHaveBeenCalledWith(expect.any(Date), expect.any(Date), null, false);
  });

  it.each(['ADMIN', 'PASTOR'])('%s com tasks:view pode ler tarefas de todas as equipes', async (role) => {
    const repo = repository();
    await new SyncPullService(repo as unknown as SyncPullRepository).pull({ ...buyer, role, permissions: ['tasks:view'] }, new Date(0));
    expect(repo.tasks).toHaveBeenCalledWith(expect.any(Date), expect.any(Date), undefined);
    expect(repo.memberTeamIds).not.toHaveBeenCalled();
  });

  it('recusa sessão, plano ou cursor inválidos antes de acessar o banco', () => {
    expect(() => pullSync(null, null)).toThrow('Não autenticado');
    expect(() => pullSync({ tenantId: 'tenant-a' }, null)).toThrow('Não autenticado');
    expect(() => pullSync({ ...buyer, planFeatures: ['canteen'] }, null)).toThrow('plano');
    for (const cursor of ['inválido', '1960-01-01T00:00:00Z', '2999-01-01T00:00:00Z']) {
      expect(() => pullSync(buyer, cursor)).toThrow('Cursor');
    }
    expect(client).not.toHaveBeenCalled();
  });
});
