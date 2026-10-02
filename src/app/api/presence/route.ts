import { auth } from '@/auth';
import { jsonError, jsonOk } from '@/lib/http/response';
import { UnauthenticatedError } from '@/lib/http/errors';
import { createPresenceService, listPresence } from '@/server/presence/presence.controller';
import { PresencePolicy } from '@/server/presence/presence.policy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function context() {
  const session = await auth();
  if (!session?.user?.tenantId || !session.user.id || (session.user as { authValid?: boolean }).authValid === false) throw new UnauthenticatedError();
  PresencePolicy.assertView(session.user);
  return { user: session.user, tenantId: session.user.tenantId, service: createPresenceService() };
}

export async function GET() {
  try { return jsonOk(listPresence(await context())); }
  catch (error) { return jsonError(error); }
}
