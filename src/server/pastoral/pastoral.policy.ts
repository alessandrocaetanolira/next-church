import { hasActionPermission } from '@/lib/access-control';
import { ForbiddenError } from '@/lib/http/errors';

type PolicyUser = Parameters<typeof hasActionPermission>[0];

export class PastoralPolicy {
  static assertView(user: PolicyUser) {
    if (!['ADMIN', 'PASTOR'].includes(user?.role?.toUpperCase() ?? '') || !hasActionPermission(user, 'pastoral', 'view')) {
      throw new ForbiddenError('Sem permissão para consultar a área pastoral.');
    }
  }

  static assertApprove(user: PolicyUser) {
    if (!hasActionPermission(user, 'members', 'approve')) throw new ForbiddenError('Sem permissão para aprovar membros.');
  }

  static assertReject(user: PolicyUser) {
    if (!hasActionPermission(user, 'members', 'approve') || !hasActionPermission(user, 'members', 'delete')) throw new ForbiddenError('Sem permissão para rejeitar membros.');
  }
}
