import { PushSubscriptionsRepository } from '@/server/notifications/push-subscriptions.repository';
import { webPushService } from '@/infra/web-push/web-push-service';

/** Envia um aviso genérico quando não existe cliente SSE conectado para receber a troca de acesso. */
export class MemberAccessNotifier {
  constructor(private readonly subscriptions: PushSubscriptionsRepository) {}

  async sendOfflineFallback(email: string) {
    const targets = await this.subscriptions.listByEmails([email]);
    if (!targets.length) return { sent: 0, reason: 'no-subscription' as const };

    const delivery = await webPushService.send(targets, {
      title: 'Atualizamos o app',
      body: 'Abra o aplicativo para sincronizar suas permissões.',
      url: '/',
      tag: 'church-access-updated',
      data: { type: 'access-updated', url: '/' },
    });

    if (delivery.expiredIds.length) await this.subscriptions.removeMany(delivery.expiredIds);
    return delivery;
  }
}
