import { describe, expect, it, vi } from 'vitest';
import { QuizPolicy } from '@/server/quiz/quiz.policy';
import { QuizService } from '@/server/quiz/quiz.service';
import type { QuizRepository } from '@/server/quiz/quiz.repository';

const player = { role: 'MEMBER', email: 'player@test.local', name: 'Jogador', permissions: ['games:view'], planFeatures: ['games'] };
const withoutAccess = { role: 'MEMBER', email: 'blocked@test.local', permissions: [], planFeatures: ['games'] };

function repositoryMock() {
  const now = new Date('2026-09-20T12:00:00.000Z');
  return {
    listQuestions: vi.fn().mockResolvedValue([]),
    listAttempts: vi.fn().mockResolvedValue([]),
    createAttempt: vi.fn().mockResolvedValue({ id: 'attempt-1', userId: 'player@test.local', userName: 'Jogador', score: 10, totalQuestions: 2, correctAnswers: 1, completedAt: now, createdAt: now, updatedAt: now, deletedAt: null }),
  } as unknown as QuizRepository;
}

describe('camadas do Quiz', () => {
  it('protege consulta e envio por games:view', () => {
    expect(() => QuizPolicy.assertView(player)).not.toThrow();
    expect(() => QuizPolicy.assertSubmit(player)).not.toThrow();
    expect(() => QuizPolicy.assertView(withoutAccess)).toThrow('quiz');
  });

  it('valida e registra tentativa com usuário da sessão', async () => {
    const repository = repositoryMock();
    const service = new QuizService(repository);
    const result = await service.createAttempt(player, { score: 10, totalQuestions: 2, correctAnswers: 1, completedAt: '2026-09-20T12:00:00.000Z' });

    expect(result).toMatchObject({ userId: 'player@test.local', score: 10, correctAnswers: 1 });
    expect(repository.createAttempt).toHaveBeenCalledWith(expect.objectContaining({ userId: 'player@test.local', totalQuestions: 2 }));
  });

  it('rejeita tentativa inválida', async () => {
    const service = new QuizService(repositoryMock());
    await expect(service.createAttempt(player, { score: -1, totalQuestions: 2, correctAnswers: 1 })).rejects.toThrow('inválidos');
    await expect(service.createAttempt({ ...player, email: null }, { score: 1, totalQuestions: 1, correctAnswers: 1 })).rejects.toThrow('não identificado');
  });
});
