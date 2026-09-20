import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';
import { jsonError, jsonOk } from '@/lib/http/response';
import { UnauthenticatedError } from '@/lib/http/errors';
import { deleteParking, updateParking } from '@/server/parking/parking.controller';
import { ParkingRepository } from '@/server/parking/parking.repository';
import { ParkingService } from '@/server/parking/parking.service';

async function getContext() {
  const session = await auth();
  if (!session?.user?.tenantId) throw new UnauthenticatedError();
  const prisma = getTenantClient(session.user.tenantId);
  await ensureTenantSchemaExtensions(prisma);
  return { user: session.user, service: new ParkingService(new ParkingRepository(prisma), prisma, session.user.tenantId) };
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const context = await getContext(); return jsonOk(await updateParking(context.user, context.service, (await params).id, await request.json())); }
  catch (error) { return jsonError(error); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const context = await getContext(); return jsonOk(await updateParking(context.user, context.service, (await params).id, await request.json(), true)); }
  catch (error) { return jsonError(error); }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const context = await getContext(); return jsonOk(await deleteParking(context.user, context.service, (await params).id)); }
  catch (error) { return jsonError(error); }
}
