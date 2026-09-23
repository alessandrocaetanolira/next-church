import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { jsonError, jsonOk } from '@/lib/http/response';
import { UnauthenticatedError } from '@/lib/http/errors';
import { getCanteenStatus, setCanteenStatus } from '@/server/canteen/operation.controller';
import { CanteenOperationRepository } from '@/server/canteen/operation.repository';
import { CanteenOperationService } from '@/server/canteen/operation.service';

async function getContext() {
  const session = await auth();
  if (!session?.user?.tenantId) throw new UnauthenticatedError();
  const prisma = getTenantClient(session.user.tenantId);
  return { session, service: new CanteenOperationService(new CanteenOperationRepository(prisma)) };
}

export async function GET() {
  try {
    const context = await getContext();
    return jsonOk(await getCanteenStatus(context.session.user, context.service));
  } catch (error) { return jsonError(error); }
}

export async function PATCH(request: Request) {
  try {
    const context = await getContext();
    const user = context.session.user;
    return jsonOk(await setCanteenStatus(user, context.service, await request.json(), user.email ?? user.name ?? null));
  } catch (error) { return jsonError(error); }
}
