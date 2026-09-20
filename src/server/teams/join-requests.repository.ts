import type { PrismaClient as TenantPrismaClient } from '@/generated/prisma-tenant';
import { ConflictError, NotFoundError } from '@/lib/http/errors';
import { generateId } from '@/lib/id';

type RequestRow = { id: string; memberId: string; memberName: string; teamId: string; teamName: string; status: string; createdAt: string; updatedAt: string };

export class TeamJoinRequestsRepository {
  constructor(private readonly prisma: TenantPrismaClient) {}

  list(role: string | null | undefined, linkedMemberId: string | null | undefined) {
    if (role?.toUpperCase() === 'ADMIN' || role?.toUpperCase() === 'PASTOR') {
      return this.query(`SELECT id, memberId, memberName, teamId, teamName, status, createdAt, updatedAt FROM "TeamJoinRequest" WHERE deletedAt IS NULL ORDER BY createdAt DESC`);
    }
    if (role?.toUpperCase() === 'LEADER' && linkedMemberId) {
      return this.query(
        `SELECT r.id, r.memberId, r.memberName, r.teamId, r.teamName, r.status, r.createdAt, r.updatedAt
         FROM "TeamJoinRequest" r JOIN "Team" t ON t.id = r.teamId
         WHERE r.deletedAt IS NULL AND t.deletedAt IS NULL AND (',' || COALESCE(t.leaderIds, '') || ',') LIKE ?
         ORDER BY r.createdAt DESC`,
        `%,${linkedMemberId},%`,
      );
    }
    if (!linkedMemberId) return [];
    return this.query(`SELECT id, memberId, memberName, teamId, teamName, status, createdAt, updatedAt FROM "TeamJoinRequest" WHERE memberId = ? AND deletedAt IS NULL ORDER BY createdAt DESC`, linkedMemberId);
  }

  async create(memberId: string, teamId: string) {
    const [member] = await this.prisma.$queryRawUnsafe<Array<{ id: string; name: string; teamIds: string | null }>>(`SELECT id, name, teamIds FROM "Member" WHERE id = ? AND deletedAt IS NULL LIMIT 1`, memberId);
    if (!member) throw new NotFoundError('Membro não encontrado.');
    const [team] = await this.prisma.$queryRawUnsafe<Array<{ id: string; name: string }>>(`SELECT id, name FROM "Team" WHERE id = ? AND deletedAt IS NULL LIMIT 1`, teamId);
    if (!team) throw new NotFoundError('Time não encontrado.');
    const teamIds = (member.teamIds ?? '').split(',').map((value) => value.trim()).filter(Boolean);
    if (teamIds.includes(teamId)) throw new ConflictError('Você já participa desta equipe.');
    const [existing] = await this.prisma.$queryRawUnsafe<Array<{ id: string }>>(`SELECT id FROM "TeamJoinRequest" WHERE memberId = ? AND teamId = ? AND status = 'pending' AND deletedAt IS NULL LIMIT 1`, memberId, teamId);
    if (existing) throw new ConflictError('Já existe uma solicitação pendente para esta equipe.');
    const id = generateId();
    const now = new Date().toISOString();
    await this.prisma.$executeRawUnsafe(`INSERT INTO "TeamJoinRequest" (id, memberId, memberName, teamId, teamName, status, createdAt, updatedAt, deletedAt) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, NULL)`, id, member.id, member.name, team.id, team.name, now, now);
    return { id, memberName: member.name, teamId: team.id, teamName: team.name };
  }

  find(id: string) {
    return this.prisma.$queryRawUnsafe<Array<{ id: string; memberId: string; teamId: string; status: string }>>(`SELECT id, memberId, teamId, status FROM "TeamJoinRequest" WHERE id = ? AND deletedAt IS NULL LIMIT 1`, id).then(([request]) => request ?? null);
  }

  canManageTeam(teamId: string, memberId: string | null | undefined) {
    if (!memberId) return Promise.resolve(false);
    return this.prisma.$queryRawUnsafe<Array<{ id: string }>>(`SELECT id FROM "Team" WHERE id = ? AND deletedAt IS NULL AND (',' || COALESCE(leaderIds, '') || ',') LIKE ? LIMIT 1`, teamId, `%,${memberId},%`).then((rows) => rows.length > 0);
  }

  async decide(id: string, action: 'approve' | 'reject') {
    const request = await this.find(id);
    if (!request) throw new NotFoundError('Solicitação não encontrada.');
    if (request.status !== 'pending') throw new ConflictError('Solicitação já processada.');
    if (action === 'approve') {
      const [member] = await this.prisma.$queryRawUnsafe<Array<{ id: string; teamIds: string | null }>>(`SELECT id, teamIds FROM "Member" WHERE id = ? AND deletedAt IS NULL LIMIT 1`, request.memberId);
      if (member) {
        const nextTeamIds = Array.from(new Set([...(member.teamIds ?? '').split(',').map((value) => value.trim()).filter(Boolean), request.teamId]));
        const now = new Date().toISOString();
        await this.prisma.$executeRawUnsafe(`UPDATE "Member" SET "teamIds" = ?, "updatedAt" = ? WHERE id = ?`, nextTeamIds.join(','), now, member.id);
        const [membership] = await this.prisma.$queryRawUnsafe<Array<{ id: string }>>(`SELECT id FROM "GroupMember" WHERE groupId = ? AND memberId = ? AND deletedAt IS NULL LIMIT 1`, request.teamId, member.id);
        if (!membership) await this.prisma.$executeRawUnsafe(`INSERT INTO "GroupMember" (id, groupId, memberId, role, createdAt, updatedAt, deletedAt) VALUES (?, ?, ?, 'member', ?, ?, NULL)`, generateId(), request.teamId, member.id, now, now);
      }
    }
    await this.prisma.$executeRawUnsafe(`UPDATE "TeamJoinRequest" SET "status" = ?, "updatedAt" = ? WHERE id = ?`, action === 'approve' ? 'approved' : 'rejected', new Date().toISOString(), id);
    return { success: true };
  }

  private query(sql: string, ...params: string[]) {
    return this.prisma.$queryRawUnsafe<RequestRow[]>(sql, ...params);
  }
}
