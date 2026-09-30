import type { PrismaClient as TenantPrismaClient } from '@/generated/prisma-tenant';
import { generateId } from '@/lib/id';

export type EngagementProfile = { id: string; userEmail: string; devotionalStreak: number; devotionalLastDate: string | null; completedChallengeIds: string };

export class EngagementRepository {
  constructor(private readonly prisma: TenantPrismaClient) {}

  async findOrCreate(userEmail: string) {
    const [existing] = await this.prisma.$queryRawUnsafe<EngagementProfile[]>(`SELECT id, userEmail, devotionalStreak, devotionalLastDate, completedChallengeIds FROM "EngagementProfile" WHERE userEmail = ? AND deletedAt IS NULL LIMIT 1`, userEmail);
    if (existing) return existing;
    const id = generateId();
    const now = new Date().toISOString();
    await this.prisma.$executeRawUnsafe(`INSERT INTO "EngagementProfile" (id, userEmail, devotionalStreak, devotionalLastDate, completedChallengeIds, createdAt, updatedAt, deletedAt) VALUES (?, ?, 0, NULL, '[]', ?, ?, NULL)`, id, userEmail, now, now);
    return { id, userEmail, devotionalStreak: 0, devotionalLastDate: null, completedChallengeIds: '[]' };
  }

  async updateProfile(id: string, devotionalStreak: number, devotionalLastDate: string | null, completedChallengeIds: number[]) {
    await this.prisma.$executeRawUnsafe(`UPDATE "EngagementProfile" SET devotionalStreak = ?, devotionalLastDate = ?, completedChallengeIds = ?, updatedAt = ? WHERE id = ?`, devotionalStreak, devotionalLastDate, JSON.stringify(completedChallengeIds), new Date().toISOString(), id);
  }

  listQuizScores() { return this.prisma.quizAttempt.findMany({ where: { deletedAt: null }, select: { userId: true, score: true } }); }

  listGameScores() {
    return this.prisma.$queryRawUnsafe<Array<{ userId: string; score: number }>>(
      `SELECT userId, score FROM "GameScore" WHERE deletedAt IS NULL`,
    );
  }

  listApprovedMembers() {
    return this.prisma.$queryRawUnsafe<Array<{ memberId: string; memberName: string; memberEmail: string; userEmail: string }>>(
      `
        SELECT m.id AS memberId, m.name AS memberName, m.email AS memberEmail,
               COALESCE(u.email, m.email) AS userEmail
        FROM "Member" m
        LEFT JOIN "User" u ON u.linkedMemberId = m.id AND u.active = 1 AND u.deletedAt IS NULL
        WHERE m.approved = 1 AND m.active = 1 AND m.deletedAt IS NULL
        ORDER BY m.name COLLATE NOCASE ASC
      `,
    );
  }

  listEngagementProfiles() {
    return this.prisma.$queryRawUnsafe<Array<{ userEmail: string; completedChallengeIds: string }>>(
      `SELECT userEmail, completedChallengeIds FROM "EngagementProfile" WHERE deletedAt IS NULL`,
    );
  }

  async findGameScoreByRunId(runId: string) {
    const [score] = await this.prisma.$queryRawUnsafe<Array<{ id: string }>>(`SELECT id FROM "GameScore" WHERE runId = ? LIMIT 1`, runId);
    return score ?? null;
  }

  async createGameScore(data: { userId: string; userName: string; gameId: string; runId: string; score: number; completedAt: Date }) {
    const id = generateId();
    const now = new Date().toISOString();
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO "GameScore" (id, userId, userName, gameId, runId, score, completedAt, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id, data.userId, data.userName, data.gameId, data.runId, data.score, data.completedAt.toISOString(), now, now,
    );
    return { id, ...data };
  }
}
