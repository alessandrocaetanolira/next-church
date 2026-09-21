import { hasActionPermission } from '@/lib/access-control';
import { ForbiddenError } from '@/lib/http/errors';

type PolicyUser = Parameters<typeof hasActionPermission>[0];

export class KidsPolicy {
  static assertView(user: PolicyUser) {
    if (!hasActionPermission(user, 'kids', 'view')) throw new ForbiddenError('Sem permissão para consultar o Infantil.');
  }

  static assertManage(user: PolicyUser, action: 'create' | 'update' | 'delete') {
    if (!['ADMIN', 'PASTOR', 'LEADER'].includes(user?.role?.toUpperCase() ?? '') || !hasActionPermission(user, 'kids', action)) throw new ForbiddenError('Sem permissão para gerenciar o Infantil.');
  }
}
