import { auth } from '@/auth';
import { UnauthenticatedError } from '@/lib/http/errors';
import { jsonError, jsonOk } from '@/lib/http/response';
import { getTenantClient } from '@/lib/prisma-factory';
import { listGameChallenges } from '@/server/game-challenges/game-challenges.controller';
import { GameChallengesRepository } from '@/server/game-challenges/game-challenges.repository';
import { GameChallengesService } from '@/server/game-challenges/game-challenges.service';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.tenantId || !session.user.email) throw new UnauthenticatedError();
    const service = new GameChallengesService(new GameChallengesRepository(getTenantClient(session.user.tenantId)), getTenantClient(session.user.tenantId), session.user.tenantId);
    return jsonOk(await listGameChallenges(session.user, service));
  } catch (error) { return jsonError(error); }
}
