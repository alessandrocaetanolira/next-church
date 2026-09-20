import type { PrismaClient as TenantPrismaClient } from '@/generated/prisma-tenant';

export class MaterialsRepository {
  constructor(private readonly prisma: TenantPrismaClient) {}

  list() {
    return this.prisma.material.findMany({
      where: { deletedAt: null },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  findById(id: string) {
    return this.prisma.material.findFirst({ where: { id, deletedAt: null } });
  }

  create(data: { id: string; name: string; category: string; quantity: number; minQuantity: number; unit: string }) {
    return this.prisma.material.create({ data });
  }

  update(id: string, data: { name?: string; category?: string; quantity?: number; minQuantity?: number; unit?: string }) {
    return this.prisma.material.update({ where: { id }, data });
  }

  softDelete(id: string) {
    return this.prisma.material.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
