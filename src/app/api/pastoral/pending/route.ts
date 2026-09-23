import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { jsonError, jsonOk } from '@/lib/http/response';
import { UnauthenticatedError } from '@/lib/http/errors';
import { listPendingMembers } from '@/server/pastoral/pastoral.controller';
import { PastoralRepository } from '@/server/pastoral/pastoral.repository';
import { PastoralService } from '@/server/pastoral/pastoral.service';

async function getContext() {
  const session = await auth();
  if (!session?.user?.tenantId) throw new UnauthenticatedError();
  const prisma = getTenantClient(session.user.tenantId);
  const repository = new PastoralRepository(prisma);
  return { user: session.user, service: new PastoralService(repository) };
}

export async function GET() {
  try { const context = await getContext(); return jsonOk({ members: await listPendingMembers(context.user, context.service) }); }
  catch (error) { return jsonError(error); }
}
