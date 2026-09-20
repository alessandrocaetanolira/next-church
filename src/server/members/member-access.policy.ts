import { hasActionPermission } from '@/lib/access-control';
import { ForbiddenError } from '@/lib/http/errors';

type PolicyUser = Parameters<typeof hasActionPermission>[0];

export class MemberAccessPolicy {
  static assertManage(user: PolicyUser) {
    if (!hasActionPermission(user, 'members', 'manage_access')) {
      throw new ForbiddenError('Você não tem permissão para gerenciar acessos de membros.');
    }
  }
}
