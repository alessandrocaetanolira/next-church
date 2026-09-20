import { hasAnyActionPermission } from '@/lib/access-control';
import { ForbiddenError } from '@/lib/http/errors';

type PolicyUser = Parameters<typeof hasAnyActionPermission>[0];

export class MemberCreditsPolicy {
  static assertSync(user: PolicyUser) {
    if (!hasAnyActionPermission(user, 'canteen', ['operate', 'sell', 'order']) && !hasAnyActionPermission(user, 'members', ['update', 'manage_access'])) {
      throw new ForbiddenError('Sem permissão para sincronizar créditos de membros.');
    }
  }
}
