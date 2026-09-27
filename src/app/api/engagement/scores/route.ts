import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { jsonError, jsonOk } from '@/lib/http/response';
import { UnauthenticatedError } from '@/lib/http/errors';
import { recordGameScore } from '@/server/engagement/engagement.controller';
import { EngagementRepository } from '@/server/engagement/engagement.repository';
import { EngagementService } from '@/server/engagement/engagement.service';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId || !session.user.email) throw new UnauthenticatedError();
    const service = new EngagementService(new EngagementRepository(getTenantClient(session.user.tenantId)));
    return jsonOk(await recordGameScore(session.user, service, await request.json()));
  } catch (error) {
    return jsonError(error);
  }
}
