import { hasActionPermission } from '@/lib/access-control';
import { ForbiddenError } from '@/lib/http/errors';

type PolicyUser = Parameters<typeof hasActionPermission>[0];

export class CanteenSalesPolicy {
  static assertView(user: PolicyUser) {
    if (!hasActionPermission(user, 'canteen', 'view')) throw new ForbiddenError('Você não tem permissão para consultar vendas.');
  }

  static assertCreate(user: PolicyUser) {
    if (!hasActionPermission(user, 'canteen', 'sell') && !hasActionPermission(user, 'canteen', 'order')) {
      throw new ForbiddenError('Você não tem permissão para registrar pedidos ou vendas.');
    }
  }
}
