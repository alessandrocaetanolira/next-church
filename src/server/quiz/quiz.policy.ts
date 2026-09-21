import { hasActionPermission } from '@/lib/access-control';
import { ForbiddenError } from '@/lib/http/errors';

type PolicyUser = Parameters<typeof hasActionPermission>[0];

export class QuizPolicy {
  static assertView(user: PolicyUser) {
    if (!hasActionPermission(user, 'games', 'view')) throw new ForbiddenError('Sem permissão para acessar o quiz.');
  }

  static assertSubmit(user: PolicyUser) { QuizPolicy.assertView(user); }
}
