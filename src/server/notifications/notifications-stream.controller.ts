import { getTenantClient } from '@/lib/prisma-factory';
import { subscribeToTenantEvents, type ServerNotificationEvent } from '@/infra/sse/sse-broker';
import { createSseStream } from '@/infra/sse/sse-stream';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsService } from './notifications.service';

export async function openNotificationsStream(request: Request, tenantId: string, userEmail: string) {
  const service = new NotificationsService(new NotificationsRepository(getTenantClient(tenantId)));
  const email = userEmail.trim().toLowerCase();
  const sse = createSseStream(request);
  let lastSeen = new Date(Date.now() - 5_000).toISOString();
  const deliveredIds = new Set<string>();
  const deliver = (notification: ServerNotificationEvent) => {
    if (notification.userEmail !== email || deliveredIds.has(notification.id)) return;
    deliveredIds.add(notification.id);
    lastSeen = notification.createdAt;
    sse.write({ type: 'notification', notification });
  };
  const unsubscribe = subscribeToTenantEvents(tenantId, email, deliver);
  const notifications = await service.listSince(email, lastSeen);
  for (const notification of notifications) deliver({ ...notification, tenantId });
  sse.write({ type: 'connected', timestamp: new Date().toISOString() });
  request.signal.addEventListener('abort', unsubscribe, { once: true });
  return sse.response();
}
