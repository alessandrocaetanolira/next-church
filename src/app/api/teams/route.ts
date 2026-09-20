import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';
import { jsonError, jsonOk } from '@/lib/http/response';
import { UnauthenticatedError } from '@/lib/http/errors';
import { createTeam, listTeams } from '@/server/teams/teams.controller';
import { TeamsRepository } from '@/server/teams/teams.repository';
import { TeamsService } from '@/server/teams/teams.service';

async function getContext() {
  const session = await auth();
  if (!session?.user?.tenantId) throw new UnauthenticatedError();
  const prisma = getTenantClient(session.user.tenantId);
  await ensureTenantSchemaExtensions(prisma);
  const repository = new TeamsRepository(prisma);
  return { session, repository, service: new TeamsService(repository) };
}

export async function GET(_request: Request) {
  try { const context = await getContext(); return jsonOk(await listTeams({ user: context.session.user, service: context.service, repository: context.repository })); }
  catch (error) { return jsonError(error); }
}

export async function POST(request: Request) {
  try { const context = await getContext(); return jsonOk(await createTeam({ user: context.session.user, service: context.service, repository: context.repository }, await request.json()), 201); }
  catch (error) { return jsonError(error); }
}
