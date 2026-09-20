import type { PrismaClient as TenantPrismaClient } from '@/generated/prisma-tenant';
import { ensureGroupTeamCompatibility, softDeleteCanonicalTeamGroup, upsertCanonicalTeamGroup } from '@/lib/group-team-compat';
import { canManageGroup, normalizeStringArray, parseJsonField, type GroupCapability } from '@/lib/groups';
import { generateId } from '@/lib/id';

export class GroupsRepository {
  constructor(private readonly prisma: TenantPrismaClient) {}

  async list(type: string | null) {
    await ensureGroupTeamCompatibility(this.prisma);
    const [groups, memberships] = await Promise.all([
      this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
        `SELECT id, name, description, type, capabilities, color, icon, active, createdAt, updatedAt
         FROM "Group" WHERE deletedAt IS NULL AND (? IS NULL OR type = ?) ORDER BY name ASC`, type, type,
      ),
      this.prisma.$queryRawUnsafe<Array<{ groupId: string; memberId: string; role: string; memberName: string | null }>>(
        `SELECT gm.groupId, gm.memberId, gm.role, m.name as memberName
         FROM "GroupMember" gm LEFT JOIN "Member" m ON m.id = gm.memberId AND m.deletedAt IS NULL
         WHERE gm.deletedAt IS NULL`,
      ),
    ]);

    return groups.map((group) => ({
      ...group,
      capabilities: parseJsonField<GroupCapability[]>(typeof group.capabilities === 'string' ? group.capabilities : null, []),
      members: memberships.filter((membership) => membership.groupId === group.id).map((membership) => ({
        memberId: membership.memberId, role: membership.role, memberName: membership.memberName,
      })),
    }));
  }

  async create(data: {
    id: string; name: string; description: string; type: string; color: string; icon: string;
    capabilities: string[]; members: Array<{ memberId: string; role: string }>;
  }) {
    await ensureGroupTeamCompatibility(this.prisma);
    const now = new Date().toISOString();
    if (data.type === 'team') {
      await upsertCanonicalTeamGroup(this.prisma, {
        id: data.id, name: data.name, description: data.description, color: data.color, icon: data.icon,
        memberIds: data.members.map((member) => member.memberId),
        leaderIds: data.members.filter((member) => ['leader', 'responsible'].includes(member.role)).map((member) => member.memberId),
      });
      return { success: true, id: data.id };
    }

    await this.prisma.$executeRawUnsafe(
      `INSERT INTO "Group" (id, name, description, type, capabilities, color, icon, active, createdAt, updatedAt, deletedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      data.id, data.name, data.description || null, data.type, JSON.stringify(data.capabilities), data.color, data.icon, 1, now, now, null,
    );

    for (const member of data.members) {
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO "GroupMember" (id, groupId, memberId, role, createdAt, updatedAt, deletedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`, generateId(), data.id, member.memberId, member.role, now, now, null,
      );
    }
    return { success: true, id: data.id };
  }

  async findById(id: string) {
    await ensureGroupTeamCompatibility(this.prisma);
    const [group] = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT id, name, description, type, capabilities, color, icon, active, createdAt, updatedAt
       FROM "Group" WHERE id = ? AND deletedAt IS NULL LIMIT 1`, id,
    );
    if (!group) return null;
    const members = await this.prisma.$queryRawUnsafe<Array<{ id: string; memberId: string; role: string; memberName: string | null; memberEmail: string | null }>>(
      `SELECT gm.id, gm.memberId, gm.role, m.name as memberName, m.email as memberEmail
       FROM "GroupMember" gm LEFT JOIN "Member" m ON m.id = gm.memberId AND m.deletedAt IS NULL
       WHERE gm.groupId = ? AND gm.deletedAt IS NULL ORDER BY gm.role ASC, m.name ASC`, id,
    );
    return {
      ...group,
      capabilities: parseJsonField<string[]>(typeof group.capabilities === 'string' ? group.capabilities : null, []),
      members,
    };
  }

  canManage(id: string, role: string | null | undefined, linkedMemberId: string | null | undefined) {
    return canManageGroup(this.prisma, role, linkedMemberId, id);
  }

  async update(id: string, data: { name: string; description: string; type: string; color: string; icon: string; capabilities: string[]; members: Array<{ memberId: string; role: string }> }) {
    await ensureGroupTeamCompatibility(this.prisma);
    const now = new Date().toISOString();
    if (data.type === 'team') {
      await upsertCanonicalTeamGroup(this.prisma, {
        id, name: data.name, description: data.description, color: data.color, icon: data.icon,
        memberIds: data.members.map((member) => member.memberId),
        leaderIds: data.members.filter((member) => ['leader', 'responsible'].includes(member.role)).map((member) => member.memberId),
      });
      return { success: true };
    }

    await this.prisma.$executeRawUnsafe(
      `UPDATE "Group" SET name = ?, description = ?, type = ?, capabilities = ?, color = ?, icon = ?, updatedAt = ? WHERE id = ? AND deletedAt IS NULL`,
      data.name, data.description || null, data.type, JSON.stringify(data.capabilities), data.color, data.icon, now, id,
    );
    await this.prisma.$executeRawUnsafe(`UPDATE "GroupMember" SET deletedAt = ?, updatedAt = ? WHERE groupId = ? AND deletedAt IS NULL`, now, now, id);
    for (const member of data.members) {
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO "GroupMember" (id, groupId, memberId, role, createdAt, updatedAt, deletedAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        generateId(), id, member.memberId, member.role, now, now, null,
      );
    }
    return { success: true };
  }

  async remove(id: string) {
    await ensureGroupTeamCompatibility(this.prisma);
    const [group] = await this.prisma.$queryRawUnsafe<Array<{ type: string | null }>>(`SELECT type FROM "Group" WHERE id = ? AND deletedAt IS NULL LIMIT 1`, id);
    if (!group) return null;
    if (group.type === 'team') {
      await softDeleteCanonicalTeamGroup(this.prisma, id);
      return { success: true };
    }
    const now = new Date().toISOString();
    await this.prisma.$executeRawUnsafe(`UPDATE "Group" SET deletedAt = ?, updatedAt = ? WHERE id = ?`, now, now, id);
    await this.prisma.$executeRawUnsafe(`UPDATE "GroupMember" SET deletedAt = ?, updatedAt = ? WHERE groupId = ? AND deletedAt IS NULL`, now, now, id);
    return { success: true };
  }
}
