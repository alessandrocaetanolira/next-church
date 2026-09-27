import { GameChallengesPolicy } from './game-challenges.policy';
import { GameChallengesService } from './game-challenges.service';

type User = Parameters<typeof GameChallengesPolicy.assertInvite>[0];

export function listQuizChallengeInvitees(user: User, service: GameChallengesService) {
  GameChallengesPolicy.assertInvite(user);
  return service.listQuizInvitees(user?.email ?? '');
}

export function createQuizChallengeInvite(user: User, service: GameChallengesService, input: unknown) {
  GameChallengesPolicy.assertInvite(user);
  return service.inviteToQuiz(user, input);
}
