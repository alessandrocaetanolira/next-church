import { hasActionPermission } from '@/lib/access-control';
import { ForbiddenError } from '@/lib/http/errors';

type PolicyUser = Parameters<typeof hasActionPermission>[0];

export class BiblePolicy {
  static assertView(user: PolicyUser) {
    if (!hasActionPermission(user, 'bible', 'view')) throw new ForbiddenError('Sem permissão para acessar a Bíblia.');
  }
}
