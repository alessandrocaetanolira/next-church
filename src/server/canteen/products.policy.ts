import { hasActionPermission, hasAnyActionPermission } from '@/lib/access-control';
import { ForbiddenError } from '@/lib/http/errors';

type PolicyUser = Parameters<typeof hasActionPermission>[0];

export class CanteenProductsPolicy {
  static assertCatalog(user: PolicyUser) {
    if (!hasAnyActionPermission(user, 'canteen', ['catalog', 'view', 'order'])) throw new ForbiddenError('Você não tem permissão para ver o catálogo.');
  }

  static assertManage(user: PolicyUser) {
    if (!hasActionPermission(user, 'canteen', 'manage_products')) {
      throw new ForbiddenError('Você não tem permissão para gerenciar produtos da cantina.');
    }
  }
}
