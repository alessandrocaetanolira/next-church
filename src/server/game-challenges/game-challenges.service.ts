import { ConflictError, ValidationError } from '@/lib/http/errors';
import { sendNotification } from '@/lib/server/notification-service';
import type { PrismaClient as TenantPrismaClient } from '@/generated/prisma-tenant';
import { GameChallengesRepository } from './game-challenges.repository';

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
    const opponentEmail = typeof body.opponentEmail === 'string' ? email(body.opponentEmail) : '';
    if (!opponentEmail) throw new ValidationError('Selecione um membro para desafiar.');
    if (opponentEmail === challengerEmail) throw new ValidationError('Você não pode desafiar a si mesmo.');

    const opponent = await this.repository.findInvitee(opponentEmail);
    if (!opponent) throw new ValidationError('O membro selecionado não está disponível para o Quiz.');

    const existing = await this.repository.findPending('quiz', challengerEmail, opponentEmail);
    if (existing) throw new ConflictError('Já existe um convite pendente para este membro.');

    const challenge = await this.repository.createPending({
      gameType: 'quiz',
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
        title: 'Novo desafio de Quiz Bíblico',
        message: `${challenge.challengerName} desafiou você para uma partida de Quiz Bíblico.`,
        href: `/quiz?challenge=${encodeURIComponent(challenge.id)}`,
        sourceType: 'gameChallenge',
        sourceId: challenge.id,
      },
    });

    return { id: challenge.id, status: challenge.status, opponent: { email: opponentEmail, name: opponent.name } };
  }
}
