import { hasActionPermission } from '@/lib/access-control';
import { ForbiddenError } from '@/lib/http/errors';

type PolicyUser = Parameters<typeof hasActionPermission>[0];

export class ParkingPolicy {
  static assertView(user: PolicyUser) {
    if (!hasActionPermission(user, 'parking', 'view')) throw new ForbiddenError('Sem permissão para consultar vagas.');
  }

  static assertManage(user: PolicyUser, action: 'create' | 'update' | 'delete') {
    if (!['ADMIN', 'PASTOR', 'LEADER'].includes(user?.role?.toUpperCase() ?? '') || !hasActionPermission(user, 'parking', action)) throw new ForbiddenError('Sem permissão para gerenciar vagas.');
  }
}
