import { NotificationsPolicy } from './notifications.policy';
import { NotificationsService } from './notifications.service';
import { getTenantClient } from '@/lib/prisma-factory';
import { NotificationsRepository } from './notifications.repository';

type User = Parameters<typeof NotificationsPolicy.assertView>[0];

export function listNotifications(user: User, service: NotificationsService) { NotificationsPolicy.assertView(user); return service.list(user?.email as string); }
export function markNotificationRead(user: User, service: NotificationsService, id: string) { NotificationsPolicy.assertUpdate(user); return service.markRead(id, user?.email as string); }
export function markAllNotificationsRead(user: User, service: NotificationsService) { NotificationsPolicy.assertUpdate(user); return service.markAllRead(user?.email as string); }

function serviceForTenant(tenantId: string) {
  return new NotificationsService(new NotificationsRepository(getTenantClient(tenantId)));
}

export function listNotificationsForTenant(user: User, tenantId: string) {
  return listNotifications(user, serviceForTenant(tenantId));
}

export function markAllNotificationsReadForTenant(user: User, tenantId: string) {
  return markAllNotificationsRead(user, serviceForTenant(tenantId));
}

export function markNotificationReadForTenant(user: User, tenantId: string, id: string) {
  return markNotificationRead(user, serviceForTenant(tenantId), id);
}
