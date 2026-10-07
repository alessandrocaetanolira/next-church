import type { PrismaClient as TenantPrismaClient } from '@/generated/prisma-tenant';

type DayRange = { start: Date; end: Date };

export type DashboardTask = {
  id: string;
  title: string;
  date: Date;
  status: string;
  type: string;
  teamId: string;
};

export class DashboardRepository {
  constructor(private readonly prisma: TenantPrismaClient) {}

  countCompletedTasks(range: DayRange, teamIds?: string[]) {
    return this.prisma.task.count({
      where: {
        deletedAt: null,
        status: 'completed',
        date: { gte: range.start, lt: range.end },
        ...(teamIds ? { teamId: { in: teamIds } } : {}),
      },
    });
  }

  countPendingTasks(range: DayRange, teamIds?: string[]) {
    return this.prisma.task.count({
      where: {
        deletedAt: null,
        status: { not: 'completed' },
        date: { gte: range.start, lt: range.end },
        ...(teamIds ? { teamId: { in: teamIds } } : {}),
      },
    });
  }

  listUpcomingTasks(start: Date, teamIds?: string[]) {
    return this.prisma.task.findMany({
      where: {
        deletedAt: null,
        status: { not: 'completed' },
        date: { gte: start },
        ...(teamIds ? { teamId: { in: teamIds } } : {}),
      },
      orderBy: { date: 'asc' },
      take: 5,
      select: { id: true, title: true, date: true, status: true, type: true, teamId: true },
    });
  }

  async sumSales(range: DayRange) {
    const result = await this.prisma.sale.aggregate({
      _sum: { total: true },
      where: {
        deletedAt: null,
        createdAt: { gte: range.start, lt: range.end },
        paymentMethod: { notIn: ['pending', 'cancelled'] },
        // Vendas diretas não possuem orderStatus; elas precisam entrar no total.
        OR: [{ orderStatus: null }, { orderStatus: { not: 'cancelled' } }],
      },
    });
    return result._sum.total ?? 0;
  }

  async countLowStockProducts() {
    const products = await this.prisma.product.findMany({
      where: { deletedAt: null, active: true, minStock: { gt: 0 } },
      select: { stock: true, minStock: true },
    });
    return products.filter((product) => product.stock <= product.minStock).length;
  }
}
