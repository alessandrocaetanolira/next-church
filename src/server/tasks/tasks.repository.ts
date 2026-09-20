import type { PrismaClient as TenantPrismaClient } from '@/generated/prisma-tenant';

export class TasksRepository {
  constructor(private readonly prisma: TenantPrismaClient) {}

  list(teamIds?: string[]) {
    return this.prisma.task.findMany({
      where: { deletedAt: null, ...(teamIds ? { teamId: { in: teamIds } } : {}) },
      orderBy: { date: 'asc' },
    });
  }

  create(data: {
    id?: string;
    title: string; description: string | null; teamId: string; assignedTo: string | null;
    date: Date; status: string; type: string; recurrence: string;
  }) {
    return this.prisma.task.create({ data: { ...data, ...(data.id ? { id: data.id } : {}) } });
  }

  upsert(data: {
    id: string; title: string; description: string | null; teamId: string; assignedTo: string | null;
    date: Date; status: string; type: string; recurrence: string;
  }) {
    const { id, ...task } = data;
    return this.prisma.task.upsert({ where: { id }, update: task, create: { id, ...task } });
  }

  softDelete(id: string) {
    return this.prisma.task.update({ where: { id }, data: { deletedAt: new Date(), updatedAt: new Date() } });
  }

  async findTeamId(id: string) {
    const task = await this.prisma.task.findUnique({ where: { id }, select: { teamId: true } });
    return task?.teamId ?? null;
  }
}
