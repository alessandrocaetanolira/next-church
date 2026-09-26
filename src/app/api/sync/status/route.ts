import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { hasPlanFeature } from '@/lib/access-control';
import { jsonError, jsonOk } from '@/lib/http/response';
import { UnauthenticatedError, ForbiddenError } from '@/lib/http/errors';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) throw new UnauthenticatedError();
    if (!hasPlanFeature(session.user, 'offline_sync')) throw new ForbiddenError('Recurso não disponível no plano atual.');

    const prisma = getTenantClient(session.user.tenantId);
    const grouped = await prisma.syncOperation.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    return jsonOk({
      enabled: true,
      serverTime: new Date().toISOString(),
      operations: Object.fromEntries(grouped.map((item) => [item.status, item._count._all])),
    });
  } catch (error) {
    return jsonError(error);
  }
}
