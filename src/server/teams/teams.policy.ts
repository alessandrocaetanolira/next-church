import { hasActionPermission } from '@/lib/access-control';
import { ForbiddenError } from '@/lib/http/errors';
import type { TeamsRepository } from './teams.repository';

type PolicyUser = Parameters<typeof hasActionPermission>[0];

export class TeamsPolicy {
  static assertView(user: PolicyUser) {
    if (!hasActionPermission(user, 'groups', 'view')) throw new ForbiddenError('Sem permissão para consultar equipes.');
  }

  static assertCreate(user: PolicyUser) {
    if (!hasActionPermission(user, 'groups', 'create')) throw new ForbiddenError('Sem permissão para criar equipes.');
  }

  static async assertUpdate(user: PolicyUser, repository: TeamsRepository, teamId: string) {
    if (!hasActionPermission(user, 'groups', 'update') || !(await repository.canManage(teamId, user?.role, (user as { linkedMemberId?: string | null } | null)?.linkedMemberId))) {
      throw new ForbiddenError('Sem permissão para editar esta equipe.');
    }
  }

  static async assertDelete(user: PolicyUser, repository: TeamsRepository, teamId: string) {
    if (!hasActionPermission(user, 'groups', 'delete') || !(await repository.canManage(teamId, user?.role, (user as { linkedMemberId?: string | null } | null)?.linkedMemberId))) {
      throw new ForbiddenError('Sem permissão para excluir esta equipe.');
    }
  }
}
