import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';
import { jsonError, jsonOk } from '@/lib/http/response';
import { NotFoundError, UnauthenticatedError } from '@/lib/http/errors';
import { deleteGroup, getGroup, updateGroup } from '@/server/groups/groups.controller';
import { GroupsRepository } from '@/server/groups/groups.repository';
import { GroupsService } from '@/server/groups/groups.service';

async function getContext() {
  const session = await auth();
  if (!session?.user?.tenantId) throw new UnauthenticatedError();
  const prisma = getTenantClient(session.user.tenantId);
  await ensureTenantSchemaExtensions(prisma);
  const repository = new GroupsRepository(prisma);
  return { session, repository, service: new GroupsService(repository) };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getContext();
    const result = await getGroup({ user: context.session.user, service: context.service, repository: context.repository }, (await params).id);
    if (!result) throw new NotFoundError('Grupo não encontrado.');
    return jsonOk(result);
  } catch (error) { return jsonError(error); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getContext();
    return jsonOk(await updateGroup({ user: context.session.user, service: context.service, repository: context.repository }, (await params).id, await request.json()));
  } catch (error) { return jsonError(error); }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getContext();
    return jsonOk(await deleteGroup({ user: context.session.user, service: context.service, repository: context.repository }, (await params).id));
  } catch (error) { return jsonError(error); }
}
