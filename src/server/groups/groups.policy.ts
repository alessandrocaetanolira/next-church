import { hasActionPermission } from '@/lib/access-control';
import { ForbiddenError } from '@/lib/http/errors';
import type { GroupsRepository } from './groups.repository';

type PolicyUser = Parameters<typeof hasActionPermission>[0];

export class GroupsPolicy {
  static assertView(user: PolicyUser) {
    if (!hasActionPermission(user, 'groups', 'view')) throw new ForbiddenError('Sem permissão para consultar grupos.');
  }

  static assertCreate(user: PolicyUser) {
    if (!hasActionPermission(user, 'groups', 'create')) throw new ForbiddenError('Sem permissão para criar grupos.');
  }

  static async assertUpdate(user: PolicyUser, repository: GroupsRepository, groupId: string) {
    if (!hasActionPermission(user, 'groups', 'update') || !(await repository.canManage(groupId, user?.role, (user as { linkedMemberId?: string | null } | null)?.linkedMemberId))) {
      throw new ForbiddenError('Sem permissão para editar este grupo.');
    }
  }

  static async assertDelete(user: PolicyUser, repository: GroupsRepository, groupId: string) {
    if (!hasActionPermission(user, 'groups', 'delete') || !(await repository.canManage(groupId, user?.role, (user as { linkedMemberId?: string | null } | null)?.linkedMemberId))) {
      throw new ForbiddenError('Sem permissão para excluir este grupo.');
    }
  }
}
