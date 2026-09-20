import type { PrismaClient as TenantPrismaClient } from '@/generated/prisma-tenant';

export class MaterialsRepository {
  constructor(private readonly prisma: TenantPrismaClient) {}

  list(teamIds?: string[]) {
    return this.prisma.material.findMany({
      where: { deletedAt: null, ...(teamIds ? { OR: [{ teamId: null }, { teamId: { in: teamIds } }] } : {}) },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  findById(id: string) {
    return this.prisma.material.findFirst({ where: { id, deletedAt: null } });
  }

  create(data: { id: string; name: string; category: string; quantity: number; minQuantity: number; unit: string }) {
    return this.prisma.material.create({ data });
  }

  update(id: string, data: { name?: string; category?: string; quantity?: number; minQuantity?: number; unit?: string; teamId?: string | null }) {
    return this.prisma.material.update({ where: { id }, data });
  }

  softDelete(id: string) {
    return this.prisma.material.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async findTeamId(id: string) {
    const material = await this.prisma.material.findUnique({ where: { id }, select: { teamId: true } });
    return material?.teamId ?? null;
  }
}
