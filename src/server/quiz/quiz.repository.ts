import type { PrismaClient as TenantPrismaClient } from '@/generated/prisma-tenant';
import { generateId } from '@/lib/id';

export class QuizRepository {
  constructor(private readonly prisma: TenantPrismaClient) {}

  listQuestions() { return this.prisma.quizQuestion.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'asc' } }); }
  listAttempts() { return this.prisma.quizAttempt.findMany({ where: { deletedAt: null }, orderBy: { completedAt: 'desc' } }); }

  createAttempt(data: { userId: string; userName: string; score: number; totalQuestions: number; correctAnswers: number; completedAt: Date }) {
    return this.prisma.quizAttempt.create({ data: { id: generateId(), ...data } });
  }
}
