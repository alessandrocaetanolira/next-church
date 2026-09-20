import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { jsonError, jsonOk } from '@/lib/http/response';
import { UnauthenticatedError } from '@/lib/http/errors';
import { updateMemberAccess } from '@/server/members/member-access.controller';
import { MemberAccessRepository } from '@/server/members/member-access.repository';
import { MemberAccessService } from '@/server/members/member-access.service';

async function getContext() {
  const session = await auth();
  if (!session?.user?.tenantId) throw new UnauthenticatedError();
  const prisma = getTenantClient(session.user.tenantId);
  return {
    user: session.user,
    service: new MemberAccessService(new MemberAccessRepository(prisma)),
  };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await getContext();
    return jsonOk(await updateMemberAccess(context.user, context.service, (await params).id, await request.json()));
  } catch (error) {
    return jsonError(error);
  }
}
