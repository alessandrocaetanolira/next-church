import type { PrismaClient as TenantPrismaClient } from '@/generated/prisma-tenant';

export class PushSubscriptionsRepository {
  constructor(private readonly prisma: TenantPrismaClient) {}

  findUserIdByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email }, select: { id: true } });
  }

  upsert(userId: string, endpoint: string, p256dh: string, auth: string) {
    const now = new Date().toISOString();
    return this.prisma.$executeRawUnsafe(
      `INSERT INTO "PushSubscription" (id, userId, endpoint, p256dh, auth, createdAt, updatedAt)
       VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?)
       ON CONFLICT(endpoint) DO UPDATE SET userId = excluded.userId, p256dh = excluded.p256dh, auth = excluded.auth, updatedAt = excluded.updatedAt`,
      userId, endpoint, p256dh, auth, now, now,
    );
  }

  remove(userId: string, endpoint: string) {
    return this.prisma.$executeRawUnsafe('DELETE FROM "PushSubscription" WHERE userId = ? AND endpoint = ?', userId, endpoint);
  }

  removeMany(ids: string[]) {
    if (!ids.length) return { count: 0 };
    return this.prisma.$executeRawUnsafe(`DELETE FROM "PushSubscription" WHERE id IN (${ids.map(() => '?').join(',')})`, ...ids);
  }

  listByEmails(emails: string[]) {
    if (!emails.length) return [];
    return this.prisma.$queryRawUnsafe<Array<{ id: string; endpoint: string; p256dh: string; auth: string }>>(
      `SELECT p.id, p.endpoint, p.p256dh, p.auth FROM "PushSubscription" p JOIN "User" u ON u.id = p.userId WHERE lower(u.email) IN (${emails.map(() => '?').join(',')})`,
      ...emails.map((email) => email.toLowerCase()),
    );
  }
}
