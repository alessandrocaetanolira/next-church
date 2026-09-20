import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';
import { jsonError, jsonOk } from '@/lib/http/response';
import { UnauthenticatedError } from '@/lib/http/errors';
import { createMember, listMembers } from '@/server/members/members.controller';
import { MembersRepository } from '@/server/members/members.repository';
import { MembersService } from '@/server/members/members.service';

async function getController() {
  const session = await auth();
  if (!session?.user?.tenantId) throw new UnauthenticatedError();
  const prisma = getTenantClient(session.user.tenantId);
  await ensureTenantSchemaExtensions(prisma);
  return { user: session.user, service: new MembersService(new MembersRepository(prisma)) };
}

export async function GET(_request: Request) {
  try { return jsonOk(await listMembers(await getController())); } catch (error) { return jsonError(error); }
}

export async function POST(request: Request) {
  try { return jsonOk(await createMember(await getController(), await request.json()), 201); } catch (error) { return jsonError(error); }
}
