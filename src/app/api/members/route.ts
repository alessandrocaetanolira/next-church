import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { jsonError, jsonOk } from '@/lib/http/response';
import { UnauthenticatedError } from '@/lib/http/errors';
import { createMember, listMembers } from '@/server/members/members.controller';
import { MembersPolicy } from '@/server/members/members.policy';
import { MembersRepository } from '@/server/members/members.repository';
import { MembersService } from '@/server/members/members.service';

async function getController(action?: 'view' | 'create') {
  const session = await auth();
  if (!session?.user?.tenantId) throw new UnauthenticatedError();
  if (action) MembersPolicy.assert(session.user, action);
  const prisma = getTenantClient(session.user.tenantId);
  return { user: session.user, service: new MembersService(new MembersRepository(prisma)) };
}

export async function GET(_request: Request) {
  try {
    const context = await getController('view');
    return jsonOk(await listMembers(context));
  } catch (error) { return jsonError(error); }
}

export async function POST(request: Request) {
  try {
    const context = await getController('create');
    return jsonOk(await createMember(context, await request.json()), 201);
  } catch (error) { return jsonError(error); }
}
