import { auth } from '@/auth';
import { UnauthenticatedError } from '@/lib/http/errors';
import { jsonError, jsonOk } from '@/lib/http/response';
import { getTenantClient } from '@/lib/prisma-factory';
import { acceptGameChallenge, cancelGameChallenge, declineGameChallenge, getGameChallenge, playGameChallenge } from '@/server/game-challenges/game-challenges.controller';
import { GameChallengesRepository } from '@/server/game-challenges/game-challenges.repository';
import { GameChallengesService } from '@/server/game-challenges/game-challenges.service';
import { shareGameChallenge } from '@/server/game-challenges/game-challenges.controller';
import { FeedRepository } from '@/server/feed/feed.repository';
import { FeedService } from '@/server/feed/feed.service';

async function context() {
  const session = await auth();
  if (!session?.user?.tenantId || !session.user.email) throw new UnauthenticatedError();
  const prisma = getTenantClient(session.user.tenantId);
  return { session, service: new GameChallengesService(new GameChallengesRepository(prisma), prisma, session.user.tenantId) };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const value = await context(); return jsonOk(await getGameChallenge(value.session.user, value.service, (await params).id)); }
  catch (error) { return jsonError(error); }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const value = await context(); const id = (await params).id;
    const body = await request.json().catch(() => ({}));
    const action = typeof body.action === 'string' ? body.action : 'move';
    if (action === 'accept') return jsonOk(await acceptGameChallenge(value.session.user, value.service, id));
    if (action === 'decline') return jsonOk(await declineGameChallenge(value.session.user, value.service, id));
    if (action === 'cancel') return jsonOk(await cancelGameChallenge(value.session.user, value.service, id));
    if (action === 'share') {
      const prisma = getTenantClient(value.session.user.tenantId as string);
      return jsonOk(await shareGameChallenge(value.session.user, value.service, new FeedService(new FeedRepository(prisma), prisma, value.session.user.tenantId as string), id), 201);
    }
    return jsonOk(await playGameChallenge(value.session.user, value.service, id, body));
  } catch (error) { return jsonError(error); }
}
