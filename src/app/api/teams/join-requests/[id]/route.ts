import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';
import { jsonError, jsonOk } from '@/lib/http/response';
import { UnauthenticatedError, ValidationError } from '@/lib/http/errors';
import { decideJoinRequest } from '@/server/teams/join-requests.controller';
import { TeamJoinRequestsRepository } from '@/server/teams/join-requests.repository';
import { TeamJoinRequestsService } from '@/server/teams/join-requests.service';

async function getContext() {
  const session = await auth();
  if (!session?.user?.tenantId) throw new UnauthenticatedError();
  const prisma = getTenantClient(session.user.tenantId);
  await ensureTenantSchemaExtensions(prisma);
  const repository = new TeamJoinRequestsRepository(prisma);
  return { session, repository, service: new TeamJoinRequestsService(repository, prisma, session.user.tenantId) };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getContext();
    const body = await request.json();
    if (body?.action !== 'approve' && body?.action !== 'reject') throw new ValidationError('Ação inválida.');
    return jsonOk(await decideJoinRequest({ user: context.session.user, service: context.service, repository: context.repository }, (await params).id, body.action));
  } catch (error) { return jsonError(error); }
}
