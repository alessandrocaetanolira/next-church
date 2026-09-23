import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { getTeamScopedAccess } from '@/lib/server/team-scope';
import { jsonError, jsonOk } from '@/lib/http/response';
import { UnauthenticatedError } from '@/lib/http/errors';
import { createTask, listTasks } from '@/server/tasks/tasks.controller';
import { TasksRepository } from '@/server/tasks/tasks.repository';
import { TasksService } from '@/server/tasks/tasks.service';

async function getContext() {
  const session = await auth();
  if (!session?.user?.tenantId) throw new UnauthenticatedError();
  const prisma = getTenantClient(session.user.tenantId);
  return { session, service: new TasksService(new TasksRepository(prisma)), repository: new TasksRepository(prisma), scope: await getTeamScopedAccess(session, 'tasks') };
}

export async function GET() {
  try { const context = await getContext(); return jsonOk(await listTasks({ user: context.session.user, service: context.service, repository: context.repository, scope: context.scope })); }
  catch (error) { return jsonError(error); }
}

export async function POST(request: Request) {
  try { const context = await getContext(); return jsonOk(await createTask({ user: context.session.user, service: context.service, repository: context.repository, scope: context.scope }, await request.json()), 201); }
  catch (error) { return jsonError(error); }
}
