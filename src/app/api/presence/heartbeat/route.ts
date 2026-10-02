import { auth } from '@/auth';
import { jsonError, jsonOk } from '@/lib/http/response';
import { UnauthenticatedError } from '@/lib/http/errors';
import { createPresenceService, heartbeatPresence } from '@/server/presence/presence.controller';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.tenantId || !session.user.id || (session.user as { authValid?: boolean }).authValid === false) throw new UnauthenticatedError();
    return jsonOk(heartbeatPresence({ user: session.user, tenantId: session.user.tenantId, service: createPresenceService() }));
  } catch (error) { return jsonError(error); }
}
