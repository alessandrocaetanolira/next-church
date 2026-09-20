import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';
import { jsonError, jsonOk } from '@/lib/http/response';
import { UnauthenticatedError } from '@/lib/http/errors';
import { createParking, listParking } from '@/server/parking/parking.controller';
import { ParkingRepository } from '@/server/parking/parking.repository';
import { ParkingService } from '@/server/parking/parking.service';

async function getContext() {
  const session = await auth();
  if (!session?.user?.tenantId) throw new UnauthenticatedError();
  const prisma = getTenantClient(session.user.tenantId);
  await ensureTenantSchemaExtensions(prisma);
  return { user: session.user, service: new ParkingService(new ParkingRepository(prisma), prisma, session.user.tenantId) };
}

export async function GET(request: Request) {
  try { const context = await getContext(); return jsonOk(await listParking(context.user, context.service, new URL(request.url).searchParams.get('groupId'))); }
  catch (error) { return jsonError(error); }
}

export async function POST(request: Request) {
  try { const context = await getContext(); return jsonOk(await createParking(context.user, context.service, await request.json()), 201); }
  catch (error) { return jsonError(error); }
}
