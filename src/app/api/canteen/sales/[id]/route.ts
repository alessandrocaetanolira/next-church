import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { jsonError, jsonOk } from '@/lib/http/response';
import { UnauthenticatedError } from '@/lib/http/errors';
import { operateSale } from '@/server/canteen/sales-detail.controller';
import { CanteenSalesDetailService } from '@/server/canteen/sales-detail.service';
import { CanteenSalesRepository } from '@/server/canteen/sales.repository';

async function getContext() {
  const session = await auth();
  if (!session?.user?.tenantId) throw new UnauthenticatedError();
  const prisma = getTenantClient(session.user.tenantId);
  return {
    session,
    service: new CanteenSalesDetailService(new CanteenSalesRepository(prisma), prisma, session.user.tenantId),
  };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getContext();
    const user = context.session.user;
    return jsonOk(await operateSale(user, context.service, (await params).id, await request.json(), user.name ?? user.email ?? 'Sistema'));
  } catch (error) { return jsonError(error); }
}
