import type { PrismaClient as TenantPrismaClient } from '@/generated/prisma-tenant';

export type NotificationRow = { id: string; userEmail: string; type: string; title: string; message: string; href: string | null; sourceType: string | null; sourceId: string | null; readAt: Date | null; createdAt: Date };

export class NotificationsRepository {
  constructor(private readonly prisma: TenantPrismaClient) {}

  list(userEmail: string) {
    return this.prisma.$queryRawUnsafe<NotificationRow[]>(`SELECT id, userEmail, type, title, message, href, sourceType, sourceId, readAt, createdAt FROM "Notification" WHERE userEmail = ? AND deletedAt IS NULL ORDER BY createdAt DESC LIMIT 100`, userEmail);
  }

  async markRead(id: string, userEmail: string) {
    const now = new Date().toISOString();
    await this.prisma.$executeRawUnsafe(`UPDATE "Notification" SET readAt = ?, updatedAt = ? WHERE id = ? AND userEmail = ? AND deletedAt IS NULL`, now, now, id, userEmail);
    return { success: true };
  }

  async markAllRead(userEmail: string) {
    const now = new Date().toISOString();
    await this.prisma.$executeRawUnsafe(`UPDATE "Notification" SET readAt = ?, updatedAt = ? WHERE userEmail = ? AND readAt IS NULL AND deletedAt IS NULL`, now, now, userEmail);
    return { success: true };
  }
}
