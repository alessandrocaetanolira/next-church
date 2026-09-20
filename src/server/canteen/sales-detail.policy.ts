import { hasActionPermission } from '@/lib/access-control';
import { ForbiddenError } from '@/lib/http/errors';

type PolicyUser = Parameters<typeof hasActionPermission>[0];

export class CanteenSalesDetailPolicy {
  static assertOperate(user: PolicyUser) {
    if (!hasActionPermission(user, 'canteen', 'operate')) throw new ForbiddenError('Sem permissão para operar pedidos da cantina.');
  }
}
