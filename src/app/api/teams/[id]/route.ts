import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { jsonError, jsonOk } from '@/lib/http/response';
import { UnauthenticatedError } from '@/lib/http/errors';
import { deleteTeam, updateTeam } from '@/server/teams/teams.controller';
import { TeamsRepository } from '@/server/teams/teams.repository';
import { TeamsService } from '@/server/teams/teams.service';

async function getContext() {
  const session = await auth();
  if (!session?.user?.tenantId) throw new UnauthenticatedError();
  const prisma = getTenantClient(session.user.tenantId);
  const repository = new TeamsRepository(prisma);
  return { session, repository, service: new TeamsService(repository) };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const context = await getContext(); return jsonOk(await updateTeam({ user: context.session.user, service: context.service, repository: context.repository }, (await params).id, await request.json())); }
  catch (error) { return jsonError(error); }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const context = await getContext(); return jsonOk(await deleteTeam({ user: context.session.user, service: context.service, repository: context.repository }, (await params).id)); }
  catch (error) { return jsonError(error); }
}
