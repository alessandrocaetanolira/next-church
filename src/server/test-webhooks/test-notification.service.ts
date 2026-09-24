import { publishTenantEvent } from '@/infra/sse/sse-broker';
import { webPushService } from '@/infra/web-push/web-push-service';
import { PushSubscriptionsRepository } from '@/server/notifications/push-subscriptions.repository';
import { TestNotificationRepository, type TestNotificationInput } from './test-notification.repository';

export class TestNotificationService {
  constructor(
    private readonly repository: TestNotificationRepository,
    private readonly pushSubscriptions: PushSubscriptionsRepository,
  ) {}

  async sendSse(tenantId: string, input: TestNotificationInput) {
    const notification = await this.repository.create(input);
    publishTenantEvent({ ...notification, tenantId, sourceType: 'test-webhook', sourceId: notification.id });
    return { ok: true as const, channel: 'sse' as const, notificationId: notification.id };
  }

  async sendPush(input: TestNotificationInput) {
    const notification = await this.repository.create(input);
    const subscriptions = await this.pushSubscriptions.listByEmails([input.userEmail]);
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
    return { ok: true as const, channel: 'push' as const, notificationId: notification.id, delivery: result };
  }
}
