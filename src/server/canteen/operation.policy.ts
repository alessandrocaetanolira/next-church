import { hasActionPermission, hasAnyActionPermission } from '@/lib/access-control';
import { ForbiddenError } from '@/lib/http/errors';

type PolicyUser = Parameters<typeof hasActionPermission>[0];

export class CanteenOperationPolicy {
  static assertView(user: PolicyUser) {
    if (!hasAnyActionPermission(user, 'canteen', ['catalog', 'view', 'operate'])) throw new ForbiddenError('Você não tem permissão para ver o estado da cantina.');
  }

  static assertOperate(user: PolicyUser) {
    if (!hasActionPermission(user, 'canteen', 'operate')) throw new ForbiddenError('Você não tem permissão para abrir ou fechar a cantina.');
  }
}
