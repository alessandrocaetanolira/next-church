import { getTenantClient } from '@/lib/prisma-factory';
import { PushSubscriptionsRepository } from '@/server/notifications/push-subscriptions.repository';
import { TestNotificationRepository, type TestNotificationInput } from './test-notification.repository';
import { TestNotificationService } from './test-notification.service';

const input = (body: unknown): TestNotificationInput => {
  const value = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const userEmail = typeof value.userEmail === 'string' ? value.userEmail.trim().toLowerCase() : '';
  const title = typeof value.title === 'string' ? value.title.trim() : '';
  const message = typeof value.message === 'string' ? value.message.trim() : '';
  if (!userEmail || !title || !message) throw new Error('userEmail, title e message são obrigatórios.');
  return { userEmail, title, message, type: typeof value.type === 'string' && value.type.trim() ? value.type.trim() : 'test-webhook', href: typeof value.href === 'string' ? value.href : '/notifications' };
};

function service(tenantId: string) {
  const prisma = getTenantClient(tenantId);
  return new TestNotificationService(new TestNotificationRepository(prisma), new PushSubscriptionsRepository(prisma));
}

export function sendSseTest(tenantId: string, body: unknown) {
  return service(tenantId).sendSse(tenantId, input(body));
}

export function sendPushTest(tenantId: string, body: unknown) {
  return service(tenantId).sendPush(input(body));
}
