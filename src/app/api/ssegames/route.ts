import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { GameChallengesRepository } from '@/server/game-challenges/game-challenges.repository';
import { GameChallengesService } from '@/server/game-challenges/game-challenges.service';
import { createSseStream } from '@/infra/sse/sse-stream';
import { gameSseBroker } from '@/infra/sse/game-sse-broker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await auth();
  const tenantId = session?.user?.tenantId; const email = session?.user?.email;
  const challengeId = new URL(request.url).searchParams.get('challenge');
  if (!tenantId || !email || !challengeId) return new Response('Não autorizado', { status: 401 });
  const prisma = getTenantClient(tenantId);
  const service = new GameChallengesService(new GameChallengesRepository(prisma), prisma, tenantId);
  const challenge = await service.publicSnapshot(challengeId, email);
  if (!challenge) return new Response('Desafio não encontrado', { status: 404 });
  const sse = createSseStream(request);
  const unsubscribe = gameSseBroker.subscribe(tenantId, challengeId, email, (event) => sse.write({ type: event.type, challengeId, payload: event.payload }));
  sse.write({ type: 'connected', challengeId, snapshot: challenge });
  request.signal.addEventListener('abort', unsubscribe, { once: true });
  return sse.response();
}
