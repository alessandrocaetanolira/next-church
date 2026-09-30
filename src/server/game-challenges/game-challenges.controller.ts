import { GameChallengesPolicy } from './game-challenges.policy';
import { GameChallengesService } from './game-challenges.service';
import { FeedPolicy } from '@/server/feed/feed.policy';
import type { FeedService } from '@/server/feed/feed.service';

type User = Parameters<typeof GameChallengesPolicy.assertInvite>[0];

export function listQuizChallengeInvitees(user: User, service: GameChallengesService) {
  GameChallengesPolicy.assertInvite(user);
  return service.listQuizInvitees(user?.email ?? '');
}

export function createQuizChallengeInvite(user: User, service: GameChallengesService, input: unknown) {
  GameChallengesPolicy.assertInvite(user);
  return service.inviteToQuiz(user, input);
}

export function listGameChallenges(user: User, service: GameChallengesService) {
  GameChallengesPolicy.assertInvite(user);
  return service.list(user?.email ?? '');
}

export function getGameChallenge(user: User, service: GameChallengesService, id: string) {
  GameChallengesPolicy.assertInvite(user);
  return service.publicSnapshot(id, user?.email ?? '');
}

export function acceptGameChallenge(user: User, service: GameChallengesService, id: string) {
  GameChallengesPolicy.assertInvite(user);
  return service.accept(id, user?.email ?? '');
}

export function declineGameChallenge(user: User, service: GameChallengesService, id: string) {
  GameChallengesPolicy.assertInvite(user);
  return service.decline(id, user?.email ?? '');
}

export function cancelGameChallenge(user: User, service: GameChallengesService, id: string) {
  GameChallengesPolicy.assertInvite(user);
  return service.cancel(id, user?.email ?? '');
}

export function playGameChallenge(user: User, service: GameChallengesService, id: string, input: unknown) {
  GameChallengesPolicy.assertInvite(user);
  return service.move(id, user?.email ?? '', input);
}

export function shareGameChallenge(user: User, service: GameChallengesService, feedService: FeedService, id: string) {
  if (!user) throw new Error('Usuário não autenticado.');
  FeedPolicy.assertShare(user);
  return service.shareResult(id, user?.email ?? '', user, feedService);
}
