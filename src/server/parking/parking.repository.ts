import type { PrismaClient as TenantPrismaClient } from '@/generated/prisma-tenant';
import { generateId } from '@/lib/id';

export type ParkingSpotData = { groupId: string; label: string; status: string; occupiedByMemberId: string | null; occupiedByName: string | null; notes: string | null; occupiedAt: string | null };

export class ParkingRepository {
  constructor(private readonly prisma: TenantPrismaClient) {}

  list(groupId: string | null) {
    return this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(`SELECT id, groupId, label, status, occupiedByMemberId, occupiedByName, notes, occupiedAt, createdAt, updatedAt FROM "ParkingSpot" WHERE deletedAt IS NULL AND (? IS NULL OR groupId = ?) ORDER BY label ASC`, groupId, groupId);
  }

  findById(id: string) {
    return this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(`SELECT id, groupId, label, status, occupiedByMemberId, occupiedByName, notes, occupiedAt, createdAt, updatedAt FROM "ParkingSpot" WHERE id = ? AND deletedAt IS NULL LIMIT 1`, id).then(([spot]) => spot ?? null);
  }

  async create(data: ParkingSpotData) {
    const id = generateId();
    const now = new Date().toISOString();
    await this.prisma.$executeRawUnsafe(`INSERT INTO "ParkingSpot" (id, groupId, label, status, occupiedByMemberId, occupiedByName, notes, occupiedAt, createdAt, updatedAt, deletedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`, id, data.groupId, data.label, data.status, data.occupiedByMemberId, data.occupiedByName, data.notes, data.occupiedAt, now, now);
    return this.findById(id);
  }

  async update(id: string, data: ParkingSpotData) {
    await this.prisma.$executeRawUnsafe(`UPDATE "ParkingSpot" SET groupId = ?, label = ?, status = ?, occupiedByMemberId = ?, occupiedByName = ?, notes = ?, occupiedAt = ?, updatedAt = ? WHERE id = ? AND deletedAt IS NULL`, data.groupId, data.label, data.status, data.occupiedByMemberId, data.occupiedByName, data.notes, data.occupiedAt, new Date().toISOString(), id);
    return this.findById(id);
  }

  async updateStatus(id: string, data: Pick<ParkingSpotData, 'status' | 'occupiedByMemberId' | 'occupiedByName' | 'notes' | 'occupiedAt'>) {
    await this.prisma.$executeRawUnsafe(`UPDATE "ParkingSpot" SET status = ?, occupiedByMemberId = ?, occupiedByName = ?, notes = ?, occupiedAt = ?, updatedAt = ? WHERE id = ? AND deletedAt IS NULL`, data.status, data.occupiedByMemberId, data.occupiedByName, data.notes, data.occupiedAt, new Date().toISOString(), id);
    return this.findById(id);
  }

  async remove(id: string) {
    const now = new Date().toISOString();
    await this.prisma.$executeRawUnsafe(`UPDATE "ParkingSpot" SET deletedAt = ?, updatedAt = ? WHERE id = ? AND deletedAt IS NULL`, now, now, id);
    return { success: true };
  }
}
