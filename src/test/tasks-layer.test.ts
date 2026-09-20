import { describe, expect, it, vi } from 'vitest';
import { TasksPolicy } from '@/server/tasks/tasks.policy';
import { TasksService } from '@/server/tasks/tasks.service';
import type { TasksRepository } from '@/server/tasks/tasks.repository';

const manager = { role: 'MEMBER', permissions: ['tasks:view', 'tasks:create', 'tasks:update', 'tasks:delete'], planFeatures: ['tasks'] };
const viewer = { role: 'MEMBER', permissions: ['tasks:view'], planFeatures: ['tasks'] };

function repositoryMock() {
  return {
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({ id: 'task-1' }),
    upsert: vi.fn().mockResolvedValue({ id: 'task-1' }),
    softDelete: vi.fn().mockResolvedValue({ id: 'task-1', deletedAt: new Date() }),
  } as unknown as TasksRepository;
}

describe('camadas de tarefas', () => {
  it('separa leitura, criação, atualização e exclusão', () => {
    expect(() => TasksPolicy.assertView(viewer)).not.toThrow();
    expect(() => TasksPolicy.assertCreate(manager)).not.toThrow();
    expect(() => TasksPolicy.assertUpdate(manager)).not.toThrow();
    expect(() => TasksPolicy.assertDelete(manager)).not.toThrow();
    expect(() => TasksPolicy.assertCreate(viewer)).toThrow('criar tarefas');
    expect(() => TasksPolicy.assertUpdate(viewer)).toThrow('atualizar tarefas');
  });

  it('restringe tarefas às equipes acessíveis', () => {
    expect(() => TasksPolicy.assertScope({ allowed: true, hasGlobalAccess: false, accessibleTeamIds: ['team-1'] }, 'team-1')).not.toThrow();
    expect(() => TasksPolicy.assertScope({ allowed: true, hasGlobalAccess: false, accessibleTeamIds: ['team-1'] }, 'team-2')).toThrow('equipe');
    expect(() => TasksPolicy.assertScope({ allowed: true, hasGlobalAccess: true, accessibleTeamIds: [] }, null)).not.toThrow();
  });

  it('normaliza e persiste criação pelo service', async () => {
    const repository = repositoryMock();
    const service = new TasksService(repository);

    await service.create({
      title: '  Visitar membro  ', teamId: ' team-1 ', type: 'visit',
      date: '2026-09-21T10:00:00.000Z', description: '  acompanhamento ',
    });

    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Visitar membro', teamId: 'team-1', description: 'acompanhamento',
      date: new Date('2026-09-21T10:00:00.000Z'), status: 'pending', recurrence: 'none',
    }));
  });

  it('encaminha atualização e exclusão offline para o repository', async () => {
    const repository = repositoryMock();
    const service = new TasksService(repository);
    const input = { id: 'task-1', title: 'Reunião', teamId: 'team-1', type: 'meeting', date: '2026-09-22' };

    await service.sync('update', input);
    await service.sync('delete', { id: 'task-1' });

    expect(repository.upsert).toHaveBeenCalledWith(expect.objectContaining({ id: 'task-1', title: 'Reunião' }));
    expect(repository.softDelete).toHaveBeenCalledWith('task-1');
  });

  it('rejeita sincronização sem identificador ou payload válido', async () => {
    const service = new TasksService(repositoryMock());

    expect(() => service.sync('delete', {})).toThrow('Identificador');
    expect(() => service.sync('update', { id: 'task-1' })).toThrow('Título, equipe, tipo e data');
  });
});
