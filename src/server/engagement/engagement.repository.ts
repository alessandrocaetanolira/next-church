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

  listScores() { return this.prisma.quizAttempt.findMany({ where: { deletedAt: null }, select: { userId: true, score: true } }); }
}
