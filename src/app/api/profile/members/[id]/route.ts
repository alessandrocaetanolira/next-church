import { auth } from '@/auth';
import { UnauthenticatedError, NotFoundError } from '@/lib/http/errors';
import { jsonError, jsonOk } from '@/lib/http/response';
import { getTenantClient } from '@/lib/prisma-factory';
import { MembersRepository } from '@/server/members/members.repository';
import { MembersService } from '@/server/members/members.service';
import { EngagementRepository } from '@/server/engagement/engagement.repository';
import { EngagementService } from '@/server/engagement/engagement.service';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) throw new UnauthenticatedError();
    const prisma = getTenantClient(session.user.tenantId);
    const membersService = new MembersService(new MembersRepository(prisma));
    const profile = await membersService.getPublicProfileWithEngagement((await params).id, new EngagementService(new EngagementRepository(prisma)));
    if (!profile) throw new NotFoundError('Perfil não encontrado.');
    return jsonOk(profile);
  } catch (error) { return jsonError(error); }
}
