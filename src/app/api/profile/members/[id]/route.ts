import { auth } from '@/auth';
import { UnauthenticatedError, NotFoundError } from '@/lib/http/errors';
import { jsonError, jsonOk } from '@/lib/http/response';
import { getTenantClient } from '@/lib/prisma-factory';
import { getPublicMemberProfile } from '@/server/members/members.controller';
import { MembersRepository } from '@/server/members/members.repository';
import { MembersService } from '@/server/members/members.service';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) throw new UnauthenticatedError();
    const prisma = getTenantClient(session.user.tenantId);
    const profile = await getPublicMemberProfile(new MembersService(new MembersRepository(prisma)), (await params).id);
    if (!profile) throw new NotFoundError('Perfil não encontrado.');
    return jsonOk(profile);
  } catch (error) { return jsonError(error); }
}
