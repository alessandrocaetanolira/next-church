import { describe, expect, it, vi } from 'vitest';
import { DashboardPolicy } from '@/server/dashboard/dashboard.policy';
import { DashboardService, saoPauloDayRange } from '@/server/dashboard/dashboard.service';
import { DashboardRepository, type DashboardTask } from '@/server/dashboard/dashboard.repository';

const taskReader = { role: 'MEMBER', permissions: ['tasks:view'], planFeatures: ['tasks'] };
const canteenReader = { role: 'MEMBER', permissions: ['canteen:sell'], planFeatures: ['canteen'] };
const blocked = { role: 'MEMBER', permissions: [], planFeatures: ['tasks', 'canteen'] };

function repositoryMock() {
  return {
    countCompletedTasks: vi.fn().mockResolvedValue(2),
    countPendingTasks: vi.fn().mockResolvedValue(3),
    listUpcomingTasks: vi.fn().mockResolvedValue([{
      id: 'task-1', title: 'Escala', date: new Date('2026-10-07T15:00:00.000Z'), status: 'pending', type: 'service', teamId: 'team-1',
    }]),
    sumSales: vi.fn().mockResolvedValue(42.5),
    countLowStockProducts: vi.fn().mockResolvedValue(4),
  } as unknown as DashboardRepository;
}

describe('camadas do dashboard', () => {
  it('separa o acesso aos blocos de tarefas e cantina', () => {
    expect(DashboardPolicy.canViewTasks(taskReader)).toBe(true);
    expect(DashboardPolicy.canViewCanteen(canteenReader)).toBe(true);
    expect(DashboardPolicy.canViewTasks(blocked)).toBe(false);
    expect(DashboardPolicy.canViewCanteen(blocked)).toBe(false);
  });

  it('mantém os blocos disponíveis para admin e pastor conforme suas permissões', () => {
    expect(DashboardPolicy.canViewTasks({ role: 'ADMIN', permissions: [], planFeatures: ['tasks'] })).toBe(true);
    expect(DashboardPolicy.canViewCanteen({ role: 'ADMIN', permissions: [], planFeatures: ['canteen'] })).toBe(true);
    expect(DashboardPolicy.canViewTasks({ role: 'PASTOR', permissions: ['tasks:view'], planFeatures: ['tasks'] })).toBe(true);
    expect(DashboardPolicy.canViewCanteen({ role: 'PASTOR', permissions: ['canteen:view'], planFeatures: ['canteen'] })).toBe(true);
  });

  it('retorna apenas os blocos autorizados e serializa a tarefa', async () => {
    const repository = repositoryMock();
    const service = new DashboardService(repository);
    const result = await service.getSummary({
      taskScope: { allowed: true, hasGlobalAccess: false, accessibleTeamIds: ['team-1'] },
      includeCanteen: false,
    });

    expect(result.tasks).toEqual(expect.objectContaining({ completedToday: 2, pendingToday: 3 }));
    expect(result.tasks?.upcoming[0].date).toBe('2026-10-07T15:00:00.000Z');
    expect(result.canteen).toBeNull();
    expect(repository.countCompletedTasks).toHaveBeenCalledWith(expect.anything(), ['team-1']);
    expect(repository.sumSales).not.toHaveBeenCalled();
  });

  it('calcula o bloco de cantina quando solicitado', async () => {
    const repository = repositoryMock();
    const service = new DashboardService(repository);
    const result = await service.getSummary({ taskScope: null, includeCanteen: true });

    expect(result.tasks).toBeNull();
    expect(result.canteen).toEqual({ salesToday: 42.5, lowStock: 4 });
  });

  it('delimita o dia pela hora de São Paulo', async () => {
    const repository = repositoryMock();
    const service = new DashboardService(repository);
    const now = new Date('2026-10-07T02:30:00.000Z'); // 23:30 do dia anterior em São Paulo
    const result = await service.getSummary({
      taskScope: { allowed: true, hasGlobalAccess: true, accessibleTeamIds: [] },
      includeCanteen: true,
    }, now);

    const range = saoPauloDayRange(now);
    expect(range.start.toISOString()).toBe('2026-10-06T03:00:00.000Z');
    expect(result.tasks?.completedToday).toBe(2);
    expect(repository.sumSales).toHaveBeenCalledWith(expect.objectContaining({ start: range.start, end: range.end }));
  });

  it('envia filtros corretos ao repository, incluindo vendas diretas sem status', async () => {
    const prisma = {
      task: { count: vi.fn().mockResolvedValue(0), findMany: vi.fn().mockResolvedValue([] as DashboardTask[]) },
      sale: { aggregate: vi.fn().mockResolvedValue({ _sum: { total: 12 } }) },
      product: { findMany: vi.fn().mockResolvedValue([{ stock: 2, minStock: 2 }, { stock: 3, minStock: 2 }]) },
    };
    const repository = new DashboardRepository(prisma as never);
    const range = { start: new Date('2026-10-07T03:00:00.000Z'), end: new Date('2026-10-08T03:00:00.000Z') };

    await repository.countPendingTasks(range, ['team-1']);
    await repository.listUpcomingTasks(range.start, ['team-1']);
    await repository.sumSales(range);
    expect(await repository.countLowStockProducts()).toBe(1);

    expect(prisma.task.count).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ teamId: { in: ['team-1'] }, status: { not: 'completed' } }) }));
    expect(prisma.task.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 5, where: expect.objectContaining({ teamId: { in: ['team-1'] } }) }));
    expect(prisma.sale.aggregate).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        paymentMethod: { notIn: ['pending', 'cancelled'] },
        OR: [{ orderStatus: null }, { orderStatus: { not: 'cancelled' } }],
      }),
    }));
  });
});
