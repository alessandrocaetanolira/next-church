import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';
import { jsonError, jsonOk } from '@/lib/http/response';
import { UnauthenticatedError, ValidationError } from '@/lib/http/errors';
import { markNotificationRead } from '@/server/notifications/notifications.controller';
import { NotificationsRepository } from '@/server/notifications/notifications.repository';
import { NotificationsService } from '@/server/notifications/notifications.service';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.tenantId || !session.user.email) throw new UnauthenticatedError();
    const body = await request.json();
    if (body?.action !== 'markRead') throw new ValidationError('Ação inválida.');
    const prisma = getTenantClient(session.user.tenantId);
    await ensureTenantSchemaExtensions(prisma);
    const service = new NotificationsService(new NotificationsRepository(prisma));
    return jsonOk(await markNotificationRead(session.user, service, (await params).id));
  } catch (error) { return jsonError(error); }
}
