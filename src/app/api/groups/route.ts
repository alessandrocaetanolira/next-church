import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { jsonError, jsonOk } from '@/lib/http/response';
import { UnauthenticatedError } from '@/lib/http/errors';
import { listGroups, createGroup } from '@/server/groups/groups.controller';
import { GroupsRepository } from '@/server/groups/groups.repository';
import { GroupsService } from '@/server/groups/groups.service';

async function getContext() {
  const session = await auth();
  if (!session?.user?.tenantId) throw new UnauthenticatedError();
  const prisma = getTenantClient(session.user.tenantId);
  const repository = new GroupsRepository(prisma);
  return { session, repository, service: new GroupsService(repository) };
}

export async function GET(request: Request) {
  try {
    const context = await getContext();
    const type = new URL(request.url).searchParams.get('type');
    return jsonOk(await listGroups({ user: context.session.user, service: context.service, repository: context.repository }, type));
  } catch (error) { return jsonError(error); }
}

export async function POST(request: Request) {
  try {
    const context = await getContext();
    return jsonOk(await createGroup({ user: context.session.user, service: context.service, repository: context.repository }, await request.json()), 201);
  } catch (error) { return jsonError(error); }
}
