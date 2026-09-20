import { hasActionPermission } from '@/lib/access-control';
import { ForbiddenError } from '@/lib/http/errors';
import type { TeamJoinRequestsRepository } from './join-requests.repository';

type PolicyUser = Parameters<typeof hasActionPermission>[0] & { linkedMemberId?: string | null };

export class TeamJoinRequestsPolicy {
  static assertView(user: PolicyUser) {
    if (!hasActionPermission(user, 'groups', 'view')) throw new ForbiddenError('Sem permissão para consultar solicitações.');
  }

  static assertRequest(user: PolicyUser) {
    if (!user.linkedMemberId || !hasActionPermission(user, 'groups', 'request')) throw new ForbiddenError('Sem permissão para solicitar ingresso.');
  }

  static async assertManage(user: PolicyUser, repository: TeamJoinRequestsRepository, teamId: string) {
    if (!hasActionPermission(user, 'groups', 'manage_access')) throw new ForbiddenError('Sem permissão para gerenciar solicitações.');
    const role = user.role?.toUpperCase();
    if (role !== 'ADMIN' && role !== 'PASTOR' && !(await repository.canManageTeam(teamId, user.linkedMemberId))) {
      throw new ForbiddenError('Sem permissão para gerenciar solicitações desta equipe.');
    }
  }
}
