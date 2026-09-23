import webpush, { type PushSubscription } from 'web-push';

export type WebPushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
};

export type WebPushSubscription = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export class WebPushService {
  private configured = false;

  private configure() {
    if (this.configured) return true;
    const subject = process.env.VAPID_SUBJECT;
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    if (!subject || !publicKey || !privateKey) return false;
    webpush.setVapidDetails(subject, publicKey, privateKey);
    this.configured = true;
    return true;
  }

  async send(subscriptions: WebPushSubscription[], payload: WebPushPayload) {
    if (!this.configure() || subscriptions.length === 0) {
      return { sent: 0, expiredIds: [], failed: 0 };
    }

    const expiredIds: string[] = [];
    let sent = 0;
    let failed = 0;
    await Promise.all(subscriptions.map(async (subscription) => {
      try {
        const target: PushSubscription = {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        };
        await webpush.sendNotification(target, JSON.stringify(payload), {
          TTL: Number(process.env.WEB_PUSH_TTL_SECONDS ?? 86_400),
          timeout: Number(process.env.WEB_PUSH_TIMEOUT_MS ?? 10_000),
        });
        sent += 1;
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) expiredIds.push(subscription.id);
        else failed += 1;
      }
    }));
    return { sent, expiredIds, failed };
  }
}

export const webPushService = new WebPushService();
