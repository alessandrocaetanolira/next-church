import type { PrismaClient as TenantPrismaClient } from '@/generated/prisma-tenant';
import { generateId } from '@/lib/id';

export type ChildData = { name: string; birthDate: string | null; parentMemberIds: string[]; allergies: string | null; medications: string | null; healthHistory: string | null; dietaryRestrictions: string | null; canDoPhysicalActivities: boolean; notes: string | null; groupIds: string[] };

export class KidsRepository {
  constructor(private readonly prisma: TenantPrismaClient) {}

  list() {
    return this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(`SELECT id, name, birthDate, parentMemberIds, allergies, medications, healthHistory, dietaryRestrictions, canDoPhysicalActivities, notes, groupIds, createdAt, updatedAt FROM "ChildProfile" WHERE deletedAt IS NULL ORDER BY name ASC`);
  }

  findById(id: string) {
    return this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(`SELECT id, name, birthDate, parentMemberIds, allergies, medications, healthHistory, dietaryRestrictions, canDoPhysicalActivities, notes, groupIds, createdAt, updatedAt FROM "ChildProfile" WHERE id = ? AND deletedAt IS NULL LIMIT 1`, id).then(([child]) => child ?? null);
  }

  async create(data: ChildData) {
    const id = generateId();
    const now = new Date().toISOString();
    await this.prisma.$executeRawUnsafe(`INSERT INTO "ChildProfile" (id, name, birthDate, parentMemberIds, allergies, medications, healthHistory, dietaryRestrictions, canDoPhysicalActivities, notes, groupIds, createdAt, updatedAt, deletedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`, id, data.name, data.birthDate, JSON.stringify(data.parentMemberIds), data.allergies, data.medications, data.healthHistory, data.dietaryRestrictions, data.canDoPhysicalActivities ? 1 : 0, data.notes, JSON.stringify(data.groupIds), now, now);
    return this.findById(id);
  }

  async update(id: string, data: ChildData) {
    await this.prisma.$executeRawUnsafe(`UPDATE "ChildProfile" SET name = ?, birthDate = ?, parentMemberIds = ?, allergies = ?, medications = ?, healthHistory = ?, dietaryRestrictions = ?, canDoPhysicalActivities = ?, notes = ?, groupIds = ?, updatedAt = ? WHERE id = ? AND deletedAt IS NULL`, data.name, data.birthDate, JSON.stringify(data.parentMemberIds), data.allergies, data.medications, data.healthHistory, data.dietaryRestrictions, data.canDoPhysicalActivities ? 1 : 0, data.notes, JSON.stringify(data.groupIds), new Date().toISOString(), id);
    return this.findById(id);
  }

  async remove(id: string) {
    const now = new Date().toISOString();
    await this.prisma.$executeRawUnsafe(`UPDATE "ChildProfile" SET deletedAt = ?, updatedAt = ? WHERE id = ? AND deletedAt IS NULL`, now, now, id);
    return { success: true };
  }
}
