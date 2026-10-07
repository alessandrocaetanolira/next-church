import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/dashboard/summary/route';
import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { getTeamScopedAccess } from '@/lib/server/team-scope';

vi.mock('@/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/prisma-factory', () => ({ getTenantClient: vi.fn() }));
vi.mock('@/lib/server/team-scope', () => ({ getTeamScopedAccess: vi.fn() }));

const prisma = {
  task: {
    count: vi.fn(),
    findMany: vi.fn(),
  },
  sale: { aggregate: vi.fn() },
  product: { findMany: vi.fn() },
};

describe('API Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getTenantClient as ReturnType<typeof vi.fn>).mockReturnValue(prisma);
    (getTeamScopedAccess as ReturnType<typeof vi.fn>).mockResolvedValue({
      allowed: true, hasGlobalAccess: false, accessibleTeamIds: ['team-1'],
    });
    prisma.task.count.mockResolvedValueOnce(4).mockResolvedValueOnce(2);
    prisma.task.findMany.mockResolvedValue([{
      id: 'task-1', title: 'Escala', date: new Date('2026-10-07T15:00:00.000Z'), status: 'pending', type: 'service', teamId: 'team-1',
    }]);
    prisma.sale.aggregate.mockResolvedValue({ _sum: { total: 75 } });
    prisma.product.findMany.mockResolvedValue([{ stock: 1, minStock: 2 }]);
  });

  it('usa somente o banco do tenant da sessão e respeita o escopo de equipes', async () => {
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: {
        tenantId: 'church-a', role: 'LEADER', permissions: ['tasks:view', 'canteen:view'],
        planFeatures: ['tasks', 'canteen'],
      },
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(getTenantClient).toHaveBeenCalledWith('church-a');
    expect(getTeamScopedAccess).toHaveBeenCalledWith(expect.anything(), 'tasks');
    expect(prisma.task.count).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ teamId: { in: ['team-1'] } }) }));
    expect(body).toEqual(expect.objectContaining({
      tasks: expect.objectContaining({ completedToday: 4, pendingToday: 2 }),
      canteen: { salesToday: 75, lowStock: 1 },
    }));
  });

  it('rejeita sessão ausente antes de acessar um banco de tenant', async () => {
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(getTenantClient).not.toHaveBeenCalled();
  });
});
