import { getTenantClient } from '@/lib/prisma-factory';
import { subscribeGlobalAdminEvents, subscribeToTenantEvents, type ServerTenantEvent } from '@/infra/sse/sse-broker';
import { createSseStream } from '@/infra/sse/sse-stream';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsService } from './notifications.service';
import { PresencePolicy } from '@/server/presence/presence.policy';
import { PresenceRepository } from '@/server/presence/presence.repository';
import { PresenceService } from '@/server/presence/presence.service';
import { subscribePresence } from '@/server/presence/presence.controller';

export async function openNotificationsStream(
  request: Request,
  tenantId: string,
  userEmail: string,
  user?: Parameters<typeof PresencePolicy.canView>[0],
) {
  const service = new NotificationsService(new NotificationsRepository(getTenantClient(tenantId)));
  const presenceService = new PresenceService(new PresenceRepository());
  const email = userEmail.trim().toLowerCase();
  const sse = createSseStream(request);
  let lastSeen = new Date(Date.now() - 5_000).toISOString();
  const deliveredIds = new Set<string>();
  let presenceUser = user;
  let presenceEnabled = false;
  let unsubscribePresence: () => void = () => undefined;
  const detachPresence = () => {
    unsubscribePresence();
    unsubscribePresence = () => undefined;
    presenceEnabled = false;
  };
  const attachPresence = (candidate: typeof user) => {
    if (presenceEnabled || !candidate || !PresencePolicy.canView(candidate)) return;
    presenceEnabled = true;
    sse.write({ type: 'presence.snapshot', presence: presenceService.list(tenantId).presence });
    unsubscribePresence = subscribePresence({ user: candidate, tenantId, service: presenceService }, (event) => {
      sse.write(event);
    });
  };
  const deliver = (event: ServerTenantEvent) => {
    if (event.userEmail !== email || deliveredIds.has(event.id)) return;
    deliveredIds.add(event.id);
    if (event.type === 'permissions.updated' && event.role && event.permissions) {
      presenceUser = presenceUser ? { ...presenceUser, role: event.role, permissions: event.permissions } : presenceUser;
      if (presenceUser && PresencePolicy.canView(presenceUser)) attachPresence(presenceUser);
      else detachPresence();
      sse.write({ type: event.type, role: event.role, permissions: event.permissions });
      return;
    }
    lastSeen = event.createdAt;
    sse.write({ type: 'notification', notification: event });
  };
  const unsubscribe = subscribeToTenantEvents(tenantId, email, deliver);
  attachPresence(presenceUser);
  const notifications = await service.listSince(email, lastSeen);
  for (const notification of notifications) deliver({ ...notification, tenantId });
  sse.write({ type: 'connected', timestamp: new Date().toISOString() });
  const cleanup = () => {
    unsubscribe();
    detachPresence();
  };
  request.signal.addEventListener('abort', cleanup, { once: true });
  return sse.response();
}

export function openGlobalAdminStream(request: Request, adminId: string) {
  const sse = createSseStream(request);
  const unsubscribe = subscribeGlobalAdminEvents(adminId, (event) => sse.write(event));
  sse.write({ type: 'connected', scope: 'global-admin', timestamp: new Date().toISOString() });
  request.signal.addEventListener('abort', unsubscribe, { once: true });
  return sse.response();
}
