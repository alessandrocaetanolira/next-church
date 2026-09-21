import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';
import { jsonError, jsonOk } from '@/lib/http/response';
import { UnauthenticatedError } from '@/lib/http/errors';
import { deleteKid, updateKid } from '@/server/kids/kids.controller';
import { KidsRepository } from '@/server/kids/kids.repository';
import { KidsService } from '@/server/kids/kids.service';

async function getContext() {
  const session = await auth();
  if (!session?.user?.tenantId) throw new UnauthenticatedError();
  const prisma = getTenantClient(session.user.tenantId);
  await ensureTenantSchemaExtensions(prisma);
  return { user: session.user, service: new KidsService(new KidsRepository(prisma), prisma, session.user.tenantId) };
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const context = await getContext(); return jsonOk(await updateKid(context.user, context.service, (await params).id, await request.json())); }
  catch (error) { return jsonError(error); }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const context = await getContext(); return jsonOk(await deleteKid(context.user, context.service, (await params).id)); }
  catch (error) { return jsonError(error); }
}
