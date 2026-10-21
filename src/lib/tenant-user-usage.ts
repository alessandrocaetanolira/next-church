import { getTenantClient } from './prisma-factory';

export type TenantUserUsage = { total: number; active: number; inactive: number };

export async function getTenantUserUsage(
  tenant: { slug: string; databaseKey: string | null },
  databaseDirectory?: string,
): Promise<TenantUserUsage | null> {
  try {
    const client = getTenantClient(tenant.databaseKey ?? tenant.slug, databaseDirectory);
    const groups = await client.user.groupBy({
      by: ['active'],
      where: { deletedAt: null },
      _count: { _all: true },
    });
    const active = groups.find((group) => group.active)?._count._all ?? 0;
    const inactive = groups.find((group) => !group.active)?._count._all ?? 0;
    return { total: active + inactive, active, inactive };
  } catch (error) {
    console.error(`Não foi possível contar os usuários da igreja ${tenant.slug}.`, error);
    return null;
  }
}
