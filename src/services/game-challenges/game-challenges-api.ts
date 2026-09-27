import { apiRequest } from '@/services/api/client';

export type QuizChallengeInvitee = { email: string; name: string; avatarUrl: string | null };

export function listQuizChallengeInvitees() {
  return apiRequest<QuizChallengeInvitee[]>('/api/game-challenges/invitations', { cache: 'no-store' });
}

export function createQuizChallengeInvite(opponentEmail: string) {
  return apiRequest<{ id: string; status: string; opponent: { email: string; name: string } }>('/api/game-challenges/invitations', {
    method: 'POST',
    body: JSON.stringify({ opponentEmail }),
  });
}
