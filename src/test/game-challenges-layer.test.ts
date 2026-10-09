import { describe, expect, it, vi } from 'vitest';
import { GameChallengesPolicy } from '@/server/game-challenges/game-challenges.policy';
import { GameChallengesService } from '@/server/game-challenges/game-challenges.service';
import type { GameChallengesRepository } from '@/server/game-challenges/game-challenges.repository';

const { sendNotification } = vi.hoisted(() => ({ sendNotification: vi.fn().mockResolvedValue(undefined) }));

vi.mock('@/lib/server/notification-service', () => ({ sendNotification }));

const challenger = {
  email: 'challenger@test.local',
  name: 'Desafiante',
  role: 'MEMBER',
  permissions: ['games:view'],
  planFeatures: ['games'],
};

function repositoryMock() {
  return {
    listQuizInvitees: vi.fn().mockResolvedValue([{ email: 'opponent@test.local', name: 'Oponente', avatarUrl: null }]),
    findInvitee: vi.fn().mockResolvedValue({ email: 'opponent@test.local', name: 'Oponente', avatarUrl: null }),
    findPending: vi.fn().mockResolvedValue(null),
    createPending: vi.fn().mockResolvedValue({
      id: 'challenge-1',
      status: 'pending',
      challengerEmail: challenger.email,
      challengerName: challenger.name,
      opponentEmail: 'opponent@test.local',
      opponentName: 'Oponente',
    }),
  } as unknown as GameChallengesRepository;
}

describe('convites de desafios', () => {
  it('protege a seleção de oponente por games:view', () => {
    expect(() => GameChallengesPolicy.assertInvite(challenger)).not.toThrow();
    expect(() => GameChallengesPolicy.assertInvite({ ...challenger, permissions: [] })).toThrow('jogos');
  });

  it('persiste o convite e notifica somente o membro escolhido', async () => {
    const repository = repositoryMock();
    const service = new GameChallengesService(repository, {} as never, 'tenant-test');

    const result = await service.inviteToQuiz(challenger, { opponentEmail: 'OPPONENT@test.local' });

    expect(result).toMatchObject({ id: 'challenge-1', status: 'pending', opponent: { email: 'opponent@test.local' } });
    expect(repository.createPending).toHaveBeenCalledWith(expect.objectContaining({
      challengerEmail: 'challenger@test.local',
      opponentEmail: 'opponent@test.local',
      gameType: 'quiz',
    }));
    expect(sendNotification).toHaveBeenCalledWith({}, 'tenant-test', expect.objectContaining({
      recipients: ['opponent@test.local'],
      content: expect.objectContaining({ sourceId: 'challenge-1', href: '/quiz?challenge=challenge-1&game=quiz' }),
    }));
  });

  it('abre desafios de memória na interface de memória', async () => {
    const repository = repositoryMock();
    const service = new GameChallengesService(repository, {} as never, 'tenant-test');

    await service.inviteToQuiz(challenger, { opponentEmail: 'opponent@test.local', gameType: 'memory' });

    expect(sendNotification).toHaveBeenLastCalledWith({}, 'tenant-test', expect.objectContaining({
      content: expect.objectContaining({ href: '/jogos-novos/memoria?challenge=challenge-1' }),
    }));
  });

  it('persiste uma única ordem de perguntas quando o desafio de quiz é aceito', async () => {
    const repository = repositoryMock();
    const pending = {
      id: 'challenge-1', gameType: 'quiz', status: 'pending', challengerUserEmail: challenger.email,
      challengerName: challenger.name, opponentUserEmail: 'opponent@test.local', opponentName: 'Oponente',
      expiresAt: new Date(Date.now() + 60_000), acceptedAt: null, completedAt: null, startedAt: null,
      currentTurnEmail: null, stateVersion: 0, moveSequence: 0, currentQuestion: 0, questionOrder: '[]',
      scores: '{}', winnerEmail: null, memoryBoard: '[]', memoryMatched: '[]', memoryFirstIndex: null, memorySecondIndex: null,
    };
    const active = { ...pending, status: 'active', acceptedAt: new Date(), startedAt: new Date(), currentTurnEmail: challenger.email, questionOrder: JSON.stringify(['question-1', 'question-2']) };
    const gameRepository = repository as unknown as {
      getForParticipant: ReturnType<typeof vi.fn>;
      accept: ReturnType<typeof vi.fn>;
      getQuestions: ReturnType<typeof vi.fn>;
    };
    gameRepository.getForParticipant = vi.fn().mockResolvedValueOnce(pending).mockResolvedValueOnce(active);
    gameRepository.accept = vi.fn().mockResolvedValue(active);
    gameRepository.getQuestions = vi.fn().mockResolvedValue([{ id: 'question-1', question: 'Pergunta', options: '["A","B"]', points: 10 }]);
    const prisma = { $queryRawUnsafe: vi.fn().mockResolvedValue([{ id: 'question-1' }, { id: 'question-2' }]) };
    const service = new GameChallengesService(repository, prisma as never, 'tenant-test');

    const snapshot = await service.accept('challenge-1', 'opponent@test.local');

    expect(gameRepository.accept).toHaveBeenCalledWith('challenge-1', 'opponent@test.local', ['question-1', 'question-2'], []);
    expect(snapshot.currentQuestionData).toMatchObject({ question: 'Pergunta', options: ['A', 'B'] });
  });

  it('impede desafio a si mesmo e convite duplicado pendente', async () => {
    const repository = repositoryMock();
    const service = new GameChallengesService(repository, {} as never, 'tenant-test');

    await expect(service.inviteToQuiz(challenger, { opponentEmail: challenger.email })).rejects.toThrow('si mesmo');
    vi.mocked(repository.findPending).mockResolvedValueOnce({ id: 'pending-1' } as never);
    await expect(service.inviteToQuiz(challenger, { opponentEmail: 'opponent@test.local' })).rejects.toThrow('pendente');
  });
});
