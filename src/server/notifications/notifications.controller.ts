import { NotificationsPolicy } from './notifications.policy';
import { NotificationsService } from './notifications.service';

type User = Parameters<typeof NotificationsPolicy.assertView>[0];

export function listNotifications(user: User, service: NotificationsService) { NotificationsPolicy.assertView(user); return service.list(user?.email as string); }
export function markNotificationRead(user: User, service: NotificationsService, id: string) { NotificationsPolicy.assertUpdate(user); return service.markRead(id, user?.email as string); }
export function markAllNotificationsRead(user: User, service: NotificationsService) { NotificationsPolicy.assertUpdate(user); return service.markAllRead(user?.email as string); }
