import { auth } from '@/auth';
import { UnauthenticatedError } from '@/lib/http/errors';
import { jsonError, jsonOk } from '@/lib/http/response';
import { getTenantClient } from '@/lib/prisma-factory';
import { createQuizChallengeInvite, listQuizChallengeInvitees } from '@/server/game-challenges/game-challenges.controller';
import { GameChallengesRepository } from '@/server/game-challenges/game-challenges.repository';
import { GameChallengesService } from '@/server/game-challenges/game-challenges.service';

async function context() {
  const session = await auth();
  if (!session?.user?.tenantId || !session.user.email) throw new UnauthenticatedError();
  const prisma = getTenantClient(session.user.tenantId);
  return {
    user: session.user,
    service: new GameChallengesService(new GameChallengesRepository(prisma), prisma, session.user.tenantId),
  };
}

export async function GET() {
  try {
    const value = await context();
    return jsonOk(await listQuizChallengeInvitees(value.user, value.service));
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const value = await context();
    return jsonOk(await createQuizChallengeInvite(value.user, value.service, await request.json()), 201);
  } catch (error) {
    return jsonError(error);
  }
}
