import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { jsonError, jsonOk } from '@/lib/http/response';
import { UnauthenticatedError } from '@/lib/http/errors';
import { listSales, createSale } from '@/server/canteen/sales.controller';
import { CanteenSalesRepository } from '@/server/canteen/sales.repository';
import { CanteenSalesService } from '@/server/canteen/sales.service';

async function getContext() {
  const session = await auth();
  if (!session?.user?.tenantId) throw new UnauthenticatedError();
  const prisma = getTenantClient(session.user.tenantId);
  return {
    session,
    service: new CanteenSalesService(new CanteenSalesRepository(prisma), prisma, session.user.tenantId),
  };
}

export async function GET() {
  try {
    const context = await getContext();
    return jsonOk(await listSales({ user: context.session.user, service: context.service }));
  } catch (error) { return jsonError(error); }
}

export async function POST(request: Request) {
  try {
    const context = await getContext();
    return jsonOk(await createSale({ user: context.session.user, service: context.service }, await request.json()));
  } catch (error) { return jsonError(error); }
}
