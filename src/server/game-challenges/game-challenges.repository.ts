import type { PrismaClient as TenantPrismaClient } from '@/generated/prisma-tenant';
import { generateId } from '@/lib/id';

export type ChallengeInvitee = { email: string; name: string; avatarUrl: string | null };
export type ChallengeSnapshot = {
  id: string; gameType: string; status: string; challengerUserEmail: string; challengerName: string;
  opponentUserEmail: string; opponentName: string; expiresAt: Date; acceptedAt: Date | null;
  completedAt: Date | null; startedAt: Date | null; currentTurnEmail: string | null; stateVersion: number;
  moveSequence: number; currentQuestion: number; questionOrder: string; scores: string; winnerEmail: string | null;
  memoryBoard: string; memoryMatched: string; memoryFirstIndex: number | null; memorySecondIndex: number | null;
};

export class GameChallengesRepository {
  constructor(private readonly prisma: TenantPrismaClient) {}

  async listQuizInvitees(excludedEmail: string) {
    return this.prisma.$queryRawUnsafe<ChallengeInvitee[]>(`
      SELECT DISTINCT u.email AS email, m.name AS name, u.avatarUrl AS avatarUrl
      FROM "User" u INNER JOIN "Member" m ON (u.linkedMemberId = m.id OR lower(u.email) = lower(m.email))
      WHERE u.active = 1 AND u.deletedAt IS NULL AND m.active = 1 AND m.approved = 1 AND m.deletedAt IS NULL
        AND lower(u.email) <> lower(?)
        AND (upper(COALESCE(u.role, '')) IN ('ADMIN', 'PASTOR') OR lower(COALESCE(u.permissions, '')) LIKE '%games:view%')
      ORDER BY m.name COLLATE NOCASE ASC
    `, excludedEmail);
  }

  async findInvitee(email: string) {
    const rows = await this.listQuizInvitees('');
    return rows.find((item) => item.email.trim().toLowerCase() === email.trim().toLowerCase()) ?? null;
  }

  async findPending(gameType: string, challengerEmail: string, opponentEmail: string) {
    const [challenge] = await this.prisma.$queryRawUnsafe<ChallengeSnapshot[]>(`
      SELECT id, gameType, status, challengerUserEmail, challengerName, opponentUserEmail, opponentName,
        expiresAt, acceptedAt, completedAt, startedAt, currentTurnEmail, stateVersion, moveSequence,
        currentQuestion, questionOrder, scores, winnerEmail, memoryBoard, memoryMatched, memoryFirstIndex, memorySecondIndex
      FROM "GameChallenge" WHERE gameType = ? AND status = 'pending' AND challengerUserEmail = ?
        AND opponentUserEmail = ? AND deletedAt IS NULL AND datetime(expiresAt) > datetime('now') LIMIT 1
    `, gameType, challengerEmail, opponentEmail);
    return challenge ?? null;
  }

  async createPending(input: { gameType: string; challengerEmail: string; challengerName: string; opponentEmail: string; opponentName: string; expiresAt: Date }) {
    const id = generateId(); const now = new Date().toISOString();
    await this.prisma.$executeRawUnsafe(`
      INSERT INTO "GameChallenge" (id, gameType, status, challengerUserEmail, challengerName, opponentUserEmail,
        opponentName, expiresAt, questionOrder, scores, createdAt, updatedAt, deletedAt)
      VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, '[]', '{}', ?, ?, NULL)
    `, id, input.gameType, input.challengerEmail, input.challengerName, input.opponentEmail, input.opponentName, input.expiresAt.toISOString(), now, now);
    return { id, ...input, status: 'pending' as const, createdAt: now };
  }

  async getForParticipant(id: string, participantEmail: string) {
    const [challenge] = await this.prisma.$queryRawUnsafe<ChallengeSnapshot[]>(`
      SELECT id, gameType, status, challengerUserEmail, challengerName, opponentUserEmail, opponentName,
        expiresAt, acceptedAt, completedAt, startedAt, currentTurnEmail, stateVersion, moveSequence,
        currentQuestion, questionOrder, scores, winnerEmail, memoryBoard, memoryMatched, memoryFirstIndex, memorySecondIndex
      FROM "GameChallenge" WHERE id = ? AND deletedAt IS NULL
        AND (lower(challengerUserEmail) = lower(?) OR lower(opponentUserEmail) = lower(?)) LIMIT 1
    `, id, participantEmail, participantEmail);
    return challenge ?? null;
  }

  async listForParticipant(participantEmail: string) {
    return this.prisma.$queryRawUnsafe<ChallengeSnapshot[]>(`
      SELECT id, gameType, status, challengerUserEmail, challengerName, opponentUserEmail, opponentName,
        expiresAt, acceptedAt, completedAt, startedAt, currentTurnEmail, stateVersion, moveSequence,
        currentQuestion, questionOrder, scores, winnerEmail, memoryBoard, memoryMatched, memoryFirstIndex, memorySecondIndex
      FROM "GameChallenge" WHERE deletedAt IS NULL
        AND (lower(challengerUserEmail) = lower(?) OR lower(opponentUserEmail) = lower(?)) ORDER BY createdAt DESC
    `, participantEmail, participantEmail);
  }

  async accept(id: string, participantEmail: string, questionOrder: string[], memoryBoard: string[] = []) {
    const now = new Date().toISOString();
    const [challenge] = await this.prisma.$queryRawUnsafe<ChallengeSnapshot[]>(`
      UPDATE "GameChallenge" SET status='active', acceptedAt=?, startedAt=?, updatedAt=?, currentTurnEmail=challengerUserEmail,
        questionOrder=?, scores=?, memoryBoard=? WHERE id=? AND status='pending' AND deletedAt IS NULL AND lower(opponentUserEmail)=lower(?)
      RETURNING id, gameType, status, challengerUserEmail, challengerName, opponentUserEmail, opponentName,
        expiresAt, acceptedAt, completedAt, startedAt, currentTurnEmail, stateVersion, moveSequence,
        currentQuestion, questionOrder, scores, winnerEmail, memoryBoard, memoryMatched, memoryFirstIndex, memorySecondIndex
    `, now, now, now, JSON.stringify(questionOrder), JSON.stringify({}), JSON.stringify(memoryBoard), id, participantEmail);
    return challenge ?? null;
  }

  async updateStatus(id: string, participantEmail: string, status: 'declined' | 'cancelled') {
    const result = await this.prisma.$executeRawUnsafe(`UPDATE "GameChallenge" SET status=?, updatedAt=? WHERE id=? AND deletedAt IS NULL AND status IN ('pending','active') AND (lower(challengerUserEmail)=lower(?) OR lower(opponentUserEmail)=lower(?))`, status, new Date().toISOString(), id, participantEmail, participantEmail);
    return result > 0;
  }

  async getQuestions(ids: string[]) {
    if (!ids.length) return [];
    const placeholders = ids.map(() => '?').join(',');
    return this.prisma.$queryRawUnsafe<Array<{ id: string; question: string; options: string; correctIndex: number; points: number }>>(`SELECT id, question, options, correctIndex, points FROM "QuizQuestion" WHERE deletedAt IS NULL AND id IN (${placeholders})`, ...ids);
  }

  async applyMove(input: { id: string; email: string; expectedVersion: number; answerIndex: number; questionIndex: number; correct: boolean; points: number; scores: Record<string, number>; nextTurn: string; complete: boolean; winnerEmail: string | null }) {
    const now = new Date().toISOString();
    return this.prisma.$transaction(async (tx) => {
      const sequence = input.expectedVersion + 1;
      const updated = await tx.$executeRawUnsafe(`UPDATE "GameChallenge" SET stateVersion=stateVersion+1, moveSequence=?, currentQuestion=?, currentTurnEmail=?, scores=?, lastMoveAt=?, status=?, completedAt=?, winnerEmail=?, updatedAt=? WHERE id=? AND status='active' AND stateVersion=? AND currentTurnEmail IS NOT NULL`, sequence, input.questionIndex + 1, input.nextTurn, JSON.stringify(input.scores), now, input.complete ? 'completed' : 'active', input.complete ? now : null, input.winnerEmail, now, input.id, input.expectedVersion);
      if (updated !== 1) return null;
      await tx.$executeRawUnsafe(`INSERT INTO "GameChallengeMove" (id, challengeId, sequence, playerEmail, questionIndex, answerIndex, correct, points, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, generateId(), input.id, sequence, input.email, input.questionIndex, input.answerIndex, input.correct ? 1 : 0, input.points, now);
      return { sequence, version: sequence, complete: input.complete };
    });
  }

  async applyMemoryMove(input: { id: string; email: string; expectedVersion: number; cardIndex: number; firstIndex: number | null; secondIndex: number | null; matched: number[]; nextTurn: string; scores: Record<string, number>; complete: boolean; winnerEmail: string | null }) {
    const now = new Date().toISOString(); const sequence = input.expectedVersion + 1;
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.$executeRawUnsafe(`UPDATE "GameChallenge" SET stateVersion=stateVersion+1, moveSequence=?, memoryFirstIndex=?, memorySecondIndex=?, memoryMatched=?, currentTurnEmail=?, scores=?, lastMoveAt=?, status=?, completedAt=?, winnerEmail=?, updatedAt=? WHERE id=? AND status='active' AND gameType='memory' AND stateVersion=? AND currentTurnEmail=?`, sequence, input.firstIndex, input.secondIndex, JSON.stringify(input.matched), input.nextTurn, JSON.stringify(input.scores), now, input.complete ? 'completed' : 'active', input.complete ? now : null, input.winnerEmail, now, input.id, input.expectedVersion, input.email);
      if (updated !== 1) return null;
      await tx.$executeRawUnsafe(`INSERT INTO "GameChallengeMove" (id, challengeId, sequence, playerEmail, questionIndex, answerIndex, correct, points, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, generateId(), input.id, sequence, input.email, input.firstIndex ?? input.cardIndex, input.cardIndex, input.secondIndex !== null, input.secondIndex !== null ? 10 : 0, now);
      return { sequence, version: sequence, complete: input.complete };
    });
  }
}
