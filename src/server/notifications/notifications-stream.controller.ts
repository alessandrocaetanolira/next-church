import { getTenantClient } from '@/lib/prisma-factory';
import { subscribeToTenantEvents, type ServerTenantEvent } from '@/infra/sse/sse-broker';
import { createSseStream } from '@/infra/sse/sse-stream';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsService } from './notifications.service';

export async function openNotificationsStream(request: Request, tenantId: string, userEmail: string) {
  const service = new NotificationsService(new NotificationsRepository(getTenantClient(tenantId)));
  const email = userEmail.trim().toLowerCase();
  const sse = createSseStream(request);
  let lastSeen = new Date(Date.now() - 5_000).toISOString();
  const deliveredIds = new Set<string>();
  const deliver = (event: ServerTenantEvent) => {
    if (event.userEmail !== email || deliveredIds.has(event.id)) return;
    deliveredIds.add(event.id);
    if (event.type === 'permissions.updated' && event.role && event.permissions) {
      sse.write({ type: event.type, role: event.role, permissions: event.permissions });
      return;
    }
    lastSeen = event.createdAt;
    sse.write({ type: 'notification', notification: event });
  };
  const unsubscribe = subscribeToTenantEvents(tenantId, email, deliver);
  const notifications = await service.listSince(email, lastSeen);
  for (const notification of notifications) deliver({ ...notification, tenantId });
  sse.write({ type: 'connected', timestamp: new Date().toISOString() });
  request.signal.addEventListener('abort', unsubscribe, { once: true });
  return sse.response();
}
