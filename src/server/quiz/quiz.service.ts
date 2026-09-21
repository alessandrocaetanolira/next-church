import { ValidationError } from '@/lib/http/errors';
import { QuizRepository } from './quiz.repository';

export class QuizService {
  constructor(private readonly repository: QuizRepository) {}

  listQuestions() { return this.repository.listQuestions(); }

  async listAttempts() { return (await this.repository.listAttempts()).map((attempt) => this.serializeAttempt(attempt)); }

  async createAttempt(user: { email?: string | null; name?: string | null } | null | undefined, input: unknown) {
    const body = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
    const score = Number(body.score);
    const totalQuestions = Number(body.totalQuestions);
    const correctAnswers = Number(body.correctAnswers);
    if (![score, totalQuestions, correctAnswers].every((value) => Number.isFinite(value) && value >= 0)) throw new ValidationError('Dados da tentativa inválidos.');
    if (!user?.email) throw new ValidationError('Usuário do quiz não identificado.');
    const completedAt = body.completedAt ? new Date(String(body.completedAt)) : new Date();
    if (Number.isNaN(completedAt.getTime())) throw new ValidationError('Data da tentativa inválida.');
    const attempt = await this.repository.createAttempt({ userId: user.email, userName: typeof body.userName === 'string' && body.userName ? body.userName : user.name || 'Jogador', score, totalQuestions, correctAnswers, completedAt });
    return this.serializeAttempt(attempt);
  }

  private serializeAttempt(attempt: { completedAt: Date; createdAt: Date; updatedAt: Date; deletedAt: Date | null; [key: string]: unknown }) {
    return { ...attempt, completedAt: attempt.completedAt.toISOString(), createdAt: attempt.createdAt.toISOString(), updatedAt: attempt.updatedAt.toISOString(), deletedAt: attempt.deletedAt?.toISOString() ?? null };
  }
}
