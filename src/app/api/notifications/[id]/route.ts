import { auth } from '@/auth';
import { jsonError, jsonOk } from '@/lib/http/response';
import { UnauthenticatedError, ValidationError } from '@/lib/http/errors';
import { markNotificationReadForTenant } from '@/server/notifications/notifications.controller';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId || !session.user.email) throw new UnauthenticatedError();
    const body = await request.json();
    if (body?.action !== 'markRead') throw new ValidationError('Ação inválida.');
    return jsonOk(await markNotificationReadForTenant(session.user, session.user.tenantId, (await params).id));
  } catch (error) { return jsonError(error); }
}
