import { z } from 'zod';
import type { PrismaClient as GlobalPrismaClient } from '@/generated/prisma-global';
import { webPushService } from '@/infra/web-push/web-push-service';
import { serverLogger } from '@/lib/server/logger';

export const platformPushSubscriptionSchema = z.object({
  endpoint: z.string().url().max(2048),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

export class PlatformPushService {
  constructor(private readonly prisma: GlobalPrismaClient) {}

  register(adminId: string, input: z.infer<typeof platformPushSubscriptionSchema>) {
    const now = new Date().toISOString();
    return this.prisma.$executeRawUnsafe(`INSERT INTO "PlatformPushSubscription" (id, adminId, endpoint, p256dh, auth, createdAt, updatedAt) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?) ON CONFLICT(endpoint) DO UPDATE SET adminId = excluded.adminId, p256dh = excluded.p256dh, auth = excluded.auth, updatedAt = excluded.updatedAt`, adminId, input.endpoint, input.keys.p256dh, input.keys.auth, now, now);
  }

  remove(adminId: string, endpoint: string) {
    return this.prisma.$executeRawUnsafe('DELETE FROM "PlatformPushSubscription" WHERE adminId = ? AND endpoint = ?', adminId, endpoint);
  }

  async notify(adminId: string, input: { type: string; title: string; message: string; href?: string }) {
    const notificationId = `platform_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const now = new Date().toISOString();
    await this.prisma.$executeRawUnsafe('INSERT INTO "PlatformNotification" (id, adminId, type, title, message, href, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', notificationId, adminId, input.type, input.title, input.message, input.href ?? null, now, now);
    const subscriptions = await this.prisma.$queryRawUnsafe<Array<{ id: string; endpoint: string; p256dh: string; auth: string }>>('SELECT id, endpoint, p256dh, auth FROM "PlatformPushSubscription" WHERE adminId = ?', adminId);
    const result = await webPushService.send(subscriptions, {
      title: input.title,
      body: input.message,
      url: input.href ?? '/admin/tenants',
      tag: input.type,
      data: { type: input.type, notificationId, url: input.href ?? '/admin/tenants' },
    });
    if (result.expiredIds.length) await this.prisma.$executeRawUnsafe(`DELETE FROM "PlatformPushSubscription" WHERE id IN (${result.expiredIds.map(() => '?').join(',')})`, ...result.expiredIds);
    serverLogger.info('push-server', 'fallback global enviado', { adminId, sent: result.sent, failed: result.failed });
    return result;
  }
}
