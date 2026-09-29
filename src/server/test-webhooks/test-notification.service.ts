import { publishTenantEvent } from '@/infra/sse/sse-broker';
import { webPushService } from '@/infra/web-push/web-push-service';
import { PushSubscriptionsRepository } from '@/server/notifications/push-subscriptions.repository';
import { TestNotificationRepository, type TestNotificationInput } from './test-notification.repository';
import { serverLogger } from '@/lib/server/logger';

export class TestNotificationService {
  constructor(
    private readonly repository: TestNotificationRepository,
    private readonly pushSubscriptions: PushSubscriptionsRepository,
  ) {}

  async sendSse(tenantId: string, input: TestNotificationInput) {
    serverLogger.info('webhook-sse', 'criando notificação', { tenantId, userEmail: input.userEmail, type: input.type });
    const notification = await this.repository.create(input);
    serverLogger.info('webhook-sse', 'publicando evento no broker', { tenantId, notificationId: notification.id });
    publishTenantEvent({ ...notification, tenantId, sourceType: 'test-webhook', sourceId: notification.id });
    return { ok: true as const, channel: 'sse' as const, notificationId: notification.id };
  }

  async sendPush(input: TestNotificationInput) {
    serverLogger.info('webhook-push', 'criando notificação', { userEmail: input.userEmail, type: input.type });
    const notification = await this.repository.create(input);
    serverLogger.info('webhook-push', 'buscando subscriptions', { userEmail: input.userEmail });
    const subscriptions = await this.pushSubscriptions.listByEmails([input.userEmail]);
    serverLogger.info('webhook-push', 'subscriptions encontradas', { userEmail: input.userEmail, count: subscriptions.length, notificationId: notification.id });
    const result = await webPushService.send(subscriptions, {
      title: input.title,
      body: input.message,
      data: {
        type: input.type,
        tipo: input.type,
        titulo: input.title,
        mensagem: input.message,
        url: input.href ?? '/notifications',
        link: input.href ?? '/notifications',
        mobileLink: input.href ?? '/notifications',
        webLink: input.href ?? '/notifications',
        notificationId: notification.id,
      },
    });
    serverLogger.info('webhook-push', 'resultado do envio', { userEmail: input.userEmail, notificationId: notification.id, delivery: result });
    return { ok: true as const, channel: 'push' as const, notificationId: notification.id, delivery: result };
  }
}
