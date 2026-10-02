import { apiRequest } from '@/services/api/client';

export type QuizChallengeInvitee = { email: string; name: string; avatarUrl: string | null };

export function listQuizChallengeInvitees() {
  return apiRequest<QuizChallengeInvitee[]>('/api/game-challenges/invitations', { cache: 'no-store' });
}

export function createQuizChallengeInvite(opponentEmail: string, gameType: 'quiz' | 'quiz-bomba' | 'memory' = 'quiz') {
  return apiRequest<{ id: string; status: string; opponent: { email: string; name: string } }>('/api/game-challenges/invitations', {
    method: 'POST',
    body: JSON.stringify({ opponentEmail, gameType }),
  });
}

export type GameChallenge = {
  id: string;
  gameType: string;
  status: string;
  challengerUserEmail: string;
  challengerName: string;
  opponentUserEmail: string;
  opponentName: string;
  currentTurnEmail?: string | null;
  currentQuestion?: number;
  stateVersion?: number;
  scores?: Record<string, number>;
  winnerEmail?: string | null;
  currentQuestionData?: { question: string; options: string[]; points: number } | null;
  memoryState?: { cards: Array<{ index: number; id: string }>; matched: number[]; revealed: number[] } | null;
};

export function listGameChallenges() { return apiRequest<GameChallenge[]>('/api/game-challenges', { cache: 'no-store' }); }
export function getGameChallenge(id: string) { return apiRequest<GameChallenge>(`/api/game-challenges/${encodeURIComponent(id)}`, { cache: 'no-store' }); }
export function acceptGameChallenge(id: string) { return apiRequest<GameChallenge>(`/api/game-challenges/${encodeURIComponent(id)}`, { method: 'POST', body: JSON.stringify({ action: 'accept' }) }); }
export function declineGameChallenge(id: string) { return apiRequest<{ id: string; status: string }>(`/api/game-challenges/${encodeURIComponent(id)}`, { method: 'POST', body: JSON.stringify({ action: 'decline' }) }); }
export function cancelGameChallenge(id: string) { return apiRequest<{ id: string; status: string }>(`/api/game-challenges/${encodeURIComponent(id)}`, { method: 'POST', body: JSON.stringify({ action: 'cancel' }) }); }
export function playGameChallenge(id: string, input: { answerIndex?: number; cardIndex?: number; version: number }) { return apiRequest<{ correct?: boolean; points?: number; nextVersion?: number; matched?: number[]; complete?: boolean }>(`/api/game-challenges/${encodeURIComponent(id)}`, { method: 'POST', body: JSON.stringify(input) }); }
export function shareGameChallengeResult(id: string) { return apiRequest<unknown>(`/api/game-challenges/${encodeURIComponent(id)}`, { method: 'POST', body: JSON.stringify({ action: 'share' }) }); }
export function openGameChallengeStream(id: string, onMessage: (event: MessageEvent) => void) {
  const source = new EventSource(`/api/ssegames?challenge=${encodeURIComponent(id)}`);
  source.onmessage = onMessage;
  return () => source.close();
}
