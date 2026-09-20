import type { PrismaClient as TenantPrismaClient } from '@/generated/prisma-tenant';

export type CanteenStatusRecord = {
  isOpen: boolean;
  openedAt: Date | null;
  closedAt: Date | null;
  updatedBy: string | null;
};

export class CanteenOperationRepository {
  constructor(private readonly prisma: TenantPrismaClient) {}

  async getStatus(): Promise<CanteenStatusRecord> {
    const [settings] = await this.prisma.$queryRawUnsafe<Array<{
      isOpen: boolean | number; openedAt: Date | null; closedAt: Date | null; updatedBy: string | null;
    }>>(`SELECT isOpen, openedAt, closedAt, updatedBy FROM "CanteenSettings" WHERE id = 'default' LIMIT 1`);

    return {
      isOpen: settings?.isOpen === true || settings?.isOpen === 1,
      openedAt: settings?.openedAt ?? null,
      closedAt: settings?.closedAt ?? null,
      updatedBy: settings?.updatedBy ?? null,
    };
  }

  async setStatus(isOpen: boolean, updatedBy: string | null) {
    const now = new Date().toISOString();
    await this.prisma.$executeRawUnsafe(
      `
        INSERT INTO "CanteenSettings" (id, isOpen, openedAt, closedAt, updatedBy, createdAt, updatedAt)
        VALUES ('default', ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          isOpen = excluded.isOpen, openedAt = excluded.openedAt, closedAt = excluded.closedAt,
          updatedBy = excluded.updatedBy, updatedAt = excluded.updatedAt
      `,
      isOpen ? 1 : 0,
      isOpen ? now : null,
      isOpen ? null : now,
      updatedBy,
      now,
      now,
    );
    return this.getStatus();
  }
}
