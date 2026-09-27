import type { PrismaClient as TenantPrismaClient } from '@/generated/prisma-tenant';
import { generateId } from '@/lib/id';

export type ChallengeInvitee = { email: string; name: string; avatarUrl: string | null };
export type PendingChallenge = {
  id: string;
  gameType: string;
  status: string;
  challengerUserEmail: string;
  challengerName: string;
  opponentUserEmail: string;
  opponentName: string;
  expiresAt: Date;
  createdAt: Date;
};

export class GameChallengesRepository {
  constructor(private readonly prisma: TenantPrismaClient) {}

  async listQuizInvitees(excludedEmail: string) {
    return this.prisma.$queryRawUnsafe<ChallengeInvitee[]>(
      `
        SELECT DISTINCT u.email AS email, m.name AS name, u.avatarUrl AS avatarUrl
        FROM "User" u
        INNER JOIN "Member" m ON (u.linkedMemberId = m.id OR lower(u.email) = lower(m.email))
        WHERE u.active = 1
          AND u.deletedAt IS NULL
          AND m.active = 1
          AND m.approved = 1
          AND m.deletedAt IS NULL
          AND lower(u.email) <> lower(?)
          AND (
            upper(COALESCE(u.role, '')) IN ('ADMIN', 'PASTOR')
            OR lower(COALESCE(u.permissions, '')) LIKE '%games:view%'
          )
        ORDER BY m.name COLLATE NOCASE ASC
      `,
      excludedEmail,
    );
  }

  async findInvitee(email: string) {
    const rows = await this.listQuizInvitees('');
    return rows.find((item) => item.email.trim().toLowerCase() === email.trim().toLowerCase()) ?? null;
  }

  async findPending(gameType: string, challengerEmail: string, opponentEmail: string) {
    const [challenge] = await this.prisma.$queryRawUnsafe<PendingChallenge[]>(
      `
        SELECT id, gameType, status, challengerUserEmail, challengerName,
               opponentUserEmail, opponentName, expiresAt, createdAt
        FROM "GameChallenge"
        WHERE gameType = ?
          AND status = 'pending'
          AND challengerUserEmail = ?
          AND opponentUserEmail = ?
          AND deletedAt IS NULL
          AND datetime(expiresAt) > datetime('now')
        LIMIT 1
      `,
      gameType,
      challengerEmail,
      opponentEmail,
    );
    return challenge ?? null;
  }

  async createPending(input: {
    gameType: string;
    challengerEmail: string;
    challengerName: string;
    opponentEmail: string;
    opponentName: string;
    expiresAt: Date;
  }) {
    const id = generateId();
    const now = new Date().toISOString();
    await this.prisma.$executeRawUnsafe(
      `
        INSERT INTO "GameChallenge" (
          id, gameType, status, challengerUserEmail, challengerName,
          opponentUserEmail, opponentName, expiresAt, createdAt, updatedAt
        ) VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?)
      `,
      id,
      input.gameType,
      input.challengerEmail,
      input.challengerName,
      input.opponentEmail,
      input.opponentName,
      input.expiresAt.toISOString(),
      now,
      now,
    );
    return { id, ...input, status: 'pending' as const, createdAt: now };
  }
}
