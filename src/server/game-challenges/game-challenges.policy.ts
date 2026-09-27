import { hasActionPermission } from '@/lib/access-control';
import { ForbiddenError } from '@/lib/http/errors';

type PolicyUser = Parameters<typeof hasActionPermission>[0];

export class GameChallengesPolicy {
  static assertInvite(user: PolicyUser) {
    if (!hasActionPermission(user, 'games', 'view')) {
      throw new ForbiddenError('Você não tem permissão para enviar desafios de jogos.');
    }
  }
}
