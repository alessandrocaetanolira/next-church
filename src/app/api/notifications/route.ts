import { auth } from '@/auth';
import { jsonError, jsonOk } from '@/lib/http/response';
import { UnauthenticatedError, ValidationError } from '@/lib/http/errors';
import { listNotificationsForTenant, markAllNotificationsReadForTenant } from '@/server/notifications/notifications.controller';

async function getContext() {
  const session = await auth();
  if (!session?.user?.tenantId || !session.user.email) throw new UnauthenticatedError();
  return { user: session.user, tenantId: session.user.tenantId };
}

export async function GET() {
    try { const context = await getContext(); return jsonOk(await listNotificationsForTenant(context.user, context.tenantId)); }
  catch (error) { return jsonError(error); }
}

export async function PATCH(request: Request) {
  try {
    const context = await getContext();
    const body = await request.json();
    if (body?.action !== 'markAllRead') throw new ValidationError('Ação inválida.');
    return jsonOk(await markAllNotificationsReadForTenant(context.user, context.tenantId));
  } catch (error) { return jsonError(error); }
}
