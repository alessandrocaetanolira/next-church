import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';
import { jsonError, jsonOk } from '@/lib/http/response';
import { UnauthenticatedError, ValidationError } from '@/lib/http/errors';
import { listNotifications, markAllNotificationsRead } from '@/server/notifications/notifications.controller';
import { NotificationsRepository } from '@/server/notifications/notifications.repository';
import { NotificationsService } from '@/server/notifications/notifications.service';

async function getContext() {
  const session = await auth();
  if (!session?.user?.tenantId || !session.user.email) throw new UnauthenticatedError();
  const prisma = getTenantClient(session.user.tenantId);
  await ensureTenantSchemaExtensions(prisma);
  return { user: session.user, service: new NotificationsService(new NotificationsRepository(prisma)) };
}

export async function GET() {
  try { const context = await getContext(); return jsonOk(await listNotifications(context.user, context.service)); }
  catch (error) { return jsonError(error); }
}

export async function PATCH(request: Request) {
  try {
    const context = await getContext();
    const body = await request.json();
    if (body?.action !== 'markAllRead') throw new ValidationError('Ação inválida.');
    return jsonOk(await markAllNotificationsRead(context.user, context.service));
  } catch (error) { return jsonError(error); }
}
