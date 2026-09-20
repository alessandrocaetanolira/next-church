import { hasActionPermission } from '@/lib/access-control';
import { ForbiddenError } from '@/lib/http/errors';

type PolicyUser = Parameters<typeof hasActionPermission>[0];
type MemberAction = 'view' | 'create' | 'update' | 'delete';

export class MembersPolicy {
  static assert(user: PolicyUser, action: MemberAction) {
    if (!hasActionPermission(user, 'members', action)) throw new ForbiddenError('Você não tem permissão para esta ação em membros.');
  }
}
