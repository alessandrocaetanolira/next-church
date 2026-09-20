import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';
import { getTeamScopedAccess } from '@/lib/server/team-scope';
import { jsonError, jsonOk } from '@/lib/http/response';
import { UnauthenticatedError } from '@/lib/http/errors';
import { listTasks } from '@/server/tasks/tasks.controller';
import { TasksRepository } from '@/server/tasks/tasks.repository';
import { TasksService } from '@/server/tasks/tasks.service';

export async function GET(_request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) throw new UnauthenticatedError();
    const prisma = getTenantClient(session.user.tenantId);
    await ensureTenantSchemaExtensions(prisma);
    const repository = new TasksRepository(prisma);
    const service = new TasksService(repository);
    const scope = await getTeamScopedAccess(session, 'tasks');
    return jsonOk(await listTasks({ user: session.user, service, repository, scope }));
  } catch (error) { return jsonError(error); }
}
