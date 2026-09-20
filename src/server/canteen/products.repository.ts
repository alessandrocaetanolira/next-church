import type { PrismaClient as TenantPrismaClient } from '@/generated/prisma-tenant';

export class CanteenProductsRepository {
  constructor(private readonly prisma: TenantPrismaClient) {}

  list() {
    return this.prisma.product.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' } });
  }

  findById(id: string) {
    return this.prisma.product.findFirst({ where: { id, deletedAt: null } });
  }

  create(data: {
    id: string; name: string; description: string | null; imageUrl: string | null;
    price: number; cost: number; stock: number; minStock: number; category: string;
    active: boolean; availableToday: boolean;
  }) {
    return this.prisma.product.create({ data });
  }

  update(id: string, data: {
    name?: string; description?: string | null; imageUrl?: string | null; price?: number;
    cost?: number; stock?: number; minStock?: number; category?: string; active?: boolean; availableToday?: boolean;
  }) {
    return this.prisma.product.update({ where: { id }, data });
  }

  softDelete(id: string) {
    return this.prisma.product.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
