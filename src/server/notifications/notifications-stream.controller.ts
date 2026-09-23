import { getTenantClient } from '@/lib/prisma-factory';
import { subscribeToTenantEvents, type ServerNotificationEvent } from '@/infra/sse/sse-broker';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsService } from './notifications.service';

const encode = (payload: unknown) => new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`);

export async function openNotificationsStream(request: Request, tenantId: string, userEmail: string) {
  const service = new NotificationsService(new NotificationsRepository(getTenantClient(tenantId)));
  const email = userEmail.trim().toLowerCase();
  const stream = new TransformStream<Uint8Array, Uint8Array>();
  const writer = stream.writable.getWriter();
  let closed = false;
  let lastSeen = new Date(Date.now() - 5_000).toISOString();
  const deliveredIds = new Set<string>();
  const write = (payload: unknown) => { if (!closed) void writer.write(encode(payload)); };
  const deliver = (notification: ServerNotificationEvent) => {
    if (notification.userEmail !== email || deliveredIds.has(notification.id)) return;
    deliveredIds.add(notification.id);
    lastSeen = notification.createdAt;
    write({ type: 'notification', notification });
  };
  const unsubscribe = subscribeToTenantEvents(tenantId, deliver);
  const notifications = await service.listSince(email, lastSeen);
  for (const notification of notifications) deliver({ ...notification, tenantId });
  const heartbeat = setInterval(() => write({ type: 'heartbeat', timestamp: new Date().toISOString() }), 30_000);
  write({ type: 'connected', timestamp: new Date().toISOString() });
  const close = () => {
    if (closed) return;
    closed = true;
    unsubscribe();
    clearInterval(heartbeat);
    void writer.close();
  };
  request.signal.addEventListener('abort', close, { once: true });
  return new Response(stream.readable, { headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-store, must-revalidate', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' } });
}
