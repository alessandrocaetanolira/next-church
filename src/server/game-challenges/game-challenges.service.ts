import { ConflictError, NotFoundError, ValidationError } from '@/lib/http/errors';
import { sendNotification } from '@/lib/server/notification-service';
import type { PrismaClient as TenantPrismaClient } from '@/generated/prisma-tenant';
import { GameChallengesRepository } from './game-challenges.repository';
import { publishGameEvent } from '@/infra/sse/game-sse-broker';
import type { FeedService } from '@/server/feed/feed.service';

const QUIZ_INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1_000;

function email(value: string) {
  return value.trim().toLowerCase();
}

export class GameChallengesService {
  constructor(
    private readonly repository: GameChallengesRepository,
    private readonly prisma: TenantPrismaClient,
    private readonly tenantId: string,
  ) {}

  async listQuizInvitees(currentEmail: string) {
    return this.repository.listQuizInvitees(email(currentEmail));
  }

  async inviteToQuiz(challenger: { email?: string | null; name?: string | null } | null | undefined, input: unknown) {
    const challengerEmail = challenger?.email ? email(challenger.email) : '';
    const challengerName = challenger?.name?.trim() || 'Um membro';
    if (!challengerEmail) throw new ValidationError('Usuário do desafio não identificado.');

    const body = input && typeof input === 'object' ? input as Record<string, unknown> : {};
    const gameType = body.gameType === 'quiz-bomba' || body.gameType === 'memory' ? body.gameType : 'quiz';
    const opponentEmail = typeof body.opponentEmail === 'string' ? email(body.opponentEmail) : '';
    if (!opponentEmail) throw new ValidationError('Selecione um membro para desafiar.');
    if (opponentEmail === challengerEmail) throw new ValidationError('Você não pode desafiar a si mesmo.');

    const opponent = await this.repository.findInvitee(opponentEmail);
    if (!opponent) throw new ValidationError('O membro selecionado não está disponível para o Quiz.');

    const existing = await this.repository.findPending(gameType, challengerEmail, opponentEmail);
    if (existing) throw new ConflictError('Já existe um convite pendente para este membro.');

    const challenge = await this.repository.createPending({
      gameType,
      challengerEmail,
      challengerName,
      opponentEmail,
      opponentName: opponent.name,
      expiresAt: new Date(Date.now() + QUIZ_INVITE_EXPIRY_MS),
    });

    await sendNotification(this.prisma, this.tenantId, {
      recipients: [opponentEmail],
      sender: { email: challengerEmail, name: challenger?.name },
      content: {
        type: 'game-challenge-invitation',
        title: `Novo desafio de ${gameType === 'quiz-bomba' ? 'Quiz Bomba' : gameType === 'memory' ? 'Memória' : 'Quiz Bíblico'}`,
        message: `${challenge.challengerName} desafiou você para uma partida de ${gameType === 'quiz-bomba' ? 'Quiz Bomba' : gameType === 'memory' ? 'Memória' : 'Quiz Bíblico'}.`,
        // Memória possui uma interface e protocolo de jogada próprios. Abrir
        // esse convite no Quiz deixava a partida ativa sem perguntas e a tela
        // aparentava ficar aguardando indefinidamente.
        href: gameType === 'memory'
          ? `/jogos-novos/memoria?challenge=${encodeURIComponent(challenge.id)}`
          : `/quiz?challenge=${encodeURIComponent(challenge.id)}&game=${encodeURIComponent(gameType)}`,
        sourceType: 'gameChallenge',
        sourceId: challenge.id,
      },
    });

    return { id: challenge.id, status: challenge.status, opponent: { email: opponentEmail, name: opponent.name } };
  }

  async list(emailAddress: string) {
    return this.repository.listForParticipant(email(emailAddress));
  }

  async get(id: string, emailAddress: string) {
    const challenge = await this.repository.getForParticipant(id, email(emailAddress));
    if (!challenge) throw new NotFoundError('Desafio não encontrado.');
    return challenge;
  }

  async publicSnapshot(id: string, emailAddress: string) {
    const challenge = await this.get(id, emailAddress);
    const ids = JSON.parse(challenge.questionOrder || '[]') as string[];
    const [question] = await this.repository.getQuestions(ids.slice(challenge.currentQuestion, challenge.currentQuestion + 1));
    return {
      ...challenge,
      questionOrder: undefined,
      scores: JSON.parse(challenge.scores || '{}'),
      currentQuestionData: question ? { question: question.question, options: JSON.parse(question.options), points: question.points } : null,
      memoryState: challenge.gameType === 'memory' ? {
        cards: (JSON.parse(challenge.memoryBoard || '[]') as Array<{ id: string } | string>).map((card, index) => ({ index, id: typeof card === 'string' ? card : card.id })),
        matched: JSON.parse(challenge.memoryMatched || '[]'),
        revealed: [challenge.memoryFirstIndex, challenge.memorySecondIndex].filter((value): value is number => value !== null),
      } : null,
    };
  }

  async accept(id: string, emailAddress: string) {
    const current = await this.get(id, emailAddress);
    if (current.status !== 'pending') throw new ConflictError('Este convite não está mais pendente.');
    if (new Date(current.expiresAt).getTime() <= Date.now()) throw new ConflictError('Este convite expirou.');
    const questions = await this.prisma.$queryRawUnsafe<Array<{ id: string }>>(`SELECT id FROM "QuizQuestion" WHERE deletedAt IS NULL ORDER BY RANDOM() LIMIT 10`);
    if (current.gameType !== 'memory' && questions.length < 1) throw new ValidationError('Não há perguntas disponíveis para iniciar o desafio.');
    const memoryBoard = current.gameType === 'memory'
      ? Array.from({ length: 16 }, (_, index) => ({ id: `memory-${index % 8}` })).sort(() => Math.random() - 0.5).map((card) => card.id)
      : [];
    const accepted = await this.repository.accept(id, email(emailAddress), questions.map((question) => question.id), memoryBoard);
    if (!accepted) throw new ConflictError('O desafio foi atualizado por outro participante.');
    const snapshot = await this.publicSnapshot(id, emailAddress);
    for (const recipient of [accepted.challengerUserEmail, accepted.opponentUserEmail]) {
      publishGameEvent({ tenantId: this.tenantId, challengeId: id, userEmail: recipient, type: 'challenge.updated', payload: { status: accepted.status, snapshot } });
    }
    return snapshot;
  }

  async decline(id: string, emailAddress: string) {
    const changed = await this.repository.updateStatus(id, email(emailAddress), 'declined');
    if (!changed) throw new ConflictError('O desafio não pode mais ser recusado.');
    return { id, status: 'declined' };
  }

  async cancel(id: string, emailAddress: string) {
    const changed = await this.repository.updateStatus(id, email(emailAddress), 'cancelled');
    if (!changed) throw new ConflictError('O desafio não pode mais ser cancelado.');
    return { id, status: 'cancelled' };
  }

  async move(id: string, emailAddress: string, input: unknown) {
    const playerEmail = email(emailAddress);
    const challenge = await this.get(id, playerEmail);
    if (challenge.status !== 'active') throw new ConflictError('A partida não está ativa.');
    if (challenge.currentTurnEmail?.toLowerCase() !== playerEmail) throw new ConflictError('Aguarde a vez do outro jogador.');
    if (challenge.gameType === 'memory') return this.memoryMove(challenge, playerEmail, input);
    const body = input && typeof input === 'object' ? input as Record<string, unknown> : {};
    const answerIndex = Number(body.answerIndex);
    const expectedVersion = Number(body.version);
    const questionIndex = challenge.currentQuestion;
    const ids = JSON.parse(challenge.questionOrder || '[]') as string[];
    const questionId = ids[questionIndex];
    if (!questionId || !Number.isInteger(answerIndex) || !Number.isInteger(expectedVersion)) throw new ValidationError('Jogada inválida.');
    const [question] = await this.repository.getQuestions([questionId]);
    if (!question) throw new NotFoundError('Pergunta da partida não encontrada.');
    const options = JSON.parse(question.options) as unknown[];
    if (answerIndex < 0 || answerIndex >= options.length) throw new ValidationError('Resposta inválida.');
    const correct = answerIndex === Number((question as { correctIndex?: number }).correctIndex);
    const scores = JSON.parse(challenge.scores || '{}') as Record<string, number>;
    scores[playerEmail] = (scores[playerEmail] ?? 0) + (correct ? question.points : 0);
    const complete = questionIndex + 1 >= ids.length;
    const other = challenge.challengerUserEmail.toLowerCase() === playerEmail ? challenge.opponentUserEmail : challenge.challengerUserEmail;
    const winnerEmail = complete ? (scores[playerEmail] === scores[other] ? null : scores[playerEmail] > (scores[other] ?? 0) ? playerEmail : other) : null;
    const result = await this.repository.applyMove({ id, email: playerEmail, expectedVersion, answerIndex, questionIndex, correct, points: correct ? question.points : 0, scores, nextTurn: complete ? playerEmail : other, complete, winnerEmail });
    if (!result) throw new ConflictError('A partida foi alterada. Atualize o estado e tente novamente.');
    const snapshot = await this.publicSnapshot(id, playerEmail);
    for (const recipient of [challenge.challengerUserEmail, challenge.opponentUserEmail]) {
      publishGameEvent({ tenantId: this.tenantId, challengeId: id, userEmail: recipient, type: 'challenge.updated', payload: { ...result, snapshot } });
    }
    return { ...result, correct, points: correct ? question.points : 0, nextVersion: result.version };
  }

  private async memoryMove(challenge: Awaited<ReturnType<GameChallengesService['get']>>, playerEmail: string, input: unknown) {
    const body = input && typeof input === 'object' ? input as Record<string, unknown> : {};
    const cardIndex = Number(body.cardIndex); const version = Number(body.version);
    const board = JSON.parse(challenge.memoryBoard || '[]') as string[];
    const matched = JSON.parse(challenge.memoryMatched || '[]') as number[];
    if (!Number.isInteger(cardIndex) || cardIndex < 0 || cardIndex >= board.length || !Number.isInteger(version) || matched.includes(cardIndex)) throw new ValidationError('Carta inválida.');
    const first = challenge.memorySecondIndex !== null ? null : challenge.memoryFirstIndex;
    if (first !== null && first === cardIndex) throw new ValidationError('Escolha outra carta.');
    const second = first === null ? null : cardIndex;
    const nextMatched = second === null || board[first as number] !== board[second] ? matched : [...matched, first as number, second];
    const complete = nextMatched.length === board.length;
    const other = challenge.challengerUserEmail.toLowerCase() === playerEmail ? challenge.opponentUserEmail : challenge.challengerUserEmail;
    const nextTurn = second === null || board[first as number] === board[second] ? playerEmail : other;
    const scores = JSON.parse(challenge.scores || '{}') as Record<string, number>;
    if (second !== null && board[first as number] === board[second]) scores[playerEmail] = (scores[playerEmail] ?? 0) + 10;
    const winnerEmail = complete ? Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null : null;
    const result = await this.repository.applyMemoryMove({ id: challenge.id, email: playerEmail, expectedVersion: version, cardIndex, firstIndex: second === null ? cardIndex : first, secondIndex: second, matched: nextMatched, nextTurn, scores, complete, winnerEmail });
    if (!result) throw new ConflictError('A partida foi alterada. Atualize o estado e tente novamente.');
    const snapshot = await this.publicSnapshot(challenge.id, playerEmail);
    for (const recipient of [challenge.challengerUserEmail, challenge.opponentUserEmail]) publishGameEvent({ tenantId: this.tenantId, challengeId: challenge.id, userEmail: recipient, type: 'challenge.updated', payload: { ...result, snapshot } });
    return { ...result, matched: nextMatched, complete };
  }

  async shareResult(id: string, emailAddress: string, user: { email?: string | null; name?: string | null; image?: string | null }, feedService: FeedService) {
    const challenge = await this.get(id, emailAddress);
    if (challenge.status !== 'completed') throw new ConflictError('O resultado só pode ser compartilhado após a conclusão.');
    const scores = JSON.parse(challenge.scores || '{}') as Record<string, number>;
    const left = scores[challenge.challengerUserEmail.toLowerCase()] ?? 0;
    const right = scores[challenge.opponentUserEmail.toLowerCase()] ?? 0;
    const gameLabel = challenge.gameType === 'quiz-bomba' ? 'Quiz Bomba' : challenge.gameType === 'memory' ? 'Memória' : 'Quiz Bíblico';
    const content = `Desafio de ${gameLabel} concluído: ${challenge.challengerName} ${left} x ${right} ${challenge.opponentName}.`;
    return feedService.create(user, { type: 'quiz_score', title: 'Resultado de desafio', content, reference: id, share: true });
  }
}
