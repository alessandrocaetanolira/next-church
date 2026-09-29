import type { PrismaClient as TenantPrismaClient } from '@/generated/prisma-tenant';
import { generateId } from '@/lib/id';
import { serverLogger } from '@/lib/server/logger';

export type TestNotificationInput = {
  userEmail: string;
  type: string;
  title: string;
  message: string;
  href?: string | null;
};

export class TestNotificationRepository {
  constructor(private readonly prisma: TenantPrismaClient) {}

  async create(input: TestNotificationInput) {
    const id = generateId();
    serverLogger.info('notification-repository', 'inserindo notificação de teste', { id, userEmail: input.userEmail, type: input.type });
    const now = new Date().toISOString();
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO "Notification" (id, userEmail, type, title, message, href, sourceType, sourceId, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id, input.userEmail, input.type, input.title, input.message,
      input.href ?? '/notifications', 'test-webhook', id, now, now,
    );
    serverLogger.info('notification-repository', 'notificação inserida', { id });
    return { id, ...input, href: input.href ?? '/notifications', createdAt: now };
  }
}
