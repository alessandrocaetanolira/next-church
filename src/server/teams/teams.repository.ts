import type { PrismaClient as TenantPrismaClient } from '@/generated/prisma-tenant';
import { ensureGroupTeamCompatibility, parseCapabilities, parseLeaderIds, softDeleteCanonicalTeamGroup, upsertCanonicalTeamGroup } from '@/lib/group-team-compat';
import { canManageGroup } from '@/lib/groups';
import { generateId } from '@/lib/id';

export class TeamsRepository {
  constructor(private readonly prisma: TenantPrismaClient) {}

  async list() {
    await ensureGroupTeamCompatibility(this.prisma);
    const teams = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT g.id, g.name, g.description, g.color, g.icon, g.capabilities, t.leaderIds, g.createdAt, g.updatedAt, g.deletedAt
       FROM "Group" g LEFT JOIN "Team" t ON t.id = g.id AND t.deletedAt IS NULL
       WHERE g.deletedAt IS NULL AND g.type = 'team' ORDER BY name ASC`,
    );
    return teams.map((team) => ({
      ...team,
      leaderIds: parseLeaderIds(typeof team.leaderIds === 'string' ? team.leaderIds : null),
      capabilities: parseCapabilities(typeof team.capabilities === 'string' ? team.capabilities : null),
    }));
  }

  async create(data: { name: string; description: string; color: string; icon: string; memberIds: string[]; leaderIds: string[] }) {
    await ensureGroupTeamCompatibility(this.prisma);
    const id = generateId();
    await upsertCanonicalTeamGroup(this.prisma, { id, ...data });
    return { success: true, id };
  }

  canManage(id: string, role: string | null | undefined, memberId: string | null | undefined) {
    return canManageGroup(this.prisma, role, memberId, id);
  }

  async update(id: string, data: { name: string; description: string; color: string; icon: string; memberIds: string[]; leaderIds: string[] }) {
    await ensureGroupTeamCompatibility(this.prisma);
    await upsertCanonicalTeamGroup(this.prisma, { id, ...data });
    return { success: true };
  }

  async remove(id: string) {
    await ensureGroupTeamCompatibility(this.prisma);
    await softDeleteCanonicalTeamGroup(this.prisma, id);
    return { success: true };
  }
}
