import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';
import { jsonError, jsonOk } from '@/lib/http/response';
import { UnauthenticatedError } from '@/lib/http/errors';
import { deleteMember, getMember, updateMember } from '@/server/members/members.controller';
import { MembersRepository } from '@/server/members/members.repository';
import { MembersService } from '@/server/members/members.service';

async function getController() {
  const session = await auth();
  if (!session?.user?.tenantId) throw new UnauthenticatedError();
  const prisma = getTenantClient(session.user.tenantId);
  await ensureTenantSchemaExtensions(prisma);
  return { user: session.user, service: new MembersService(new MembersRepository(prisma)) };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { return jsonOk(await getMember(await getController(), (await params).id)); } catch (error) { return jsonError(error); }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { return jsonOk(await updateMember(await getController(), (await params).id, await request.json())); } catch (error) { return jsonError(error); }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { return jsonOk(await deleteMember(await getController(), (await params).id)); } catch (error) { return jsonError(error); }
}
