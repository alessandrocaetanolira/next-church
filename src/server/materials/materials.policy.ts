import { hasActionPermission, hasAnyActionPermission } from '@/lib/access-control';
import { ForbiddenError } from '@/lib/http/errors';

type PolicyUser = Parameters<typeof hasActionPermission>[0];

export type MaterialScope = { allowed: boolean; hasGlobalAccess: boolean; accessibleTeamIds: string[] };

export class MaterialsPolicy {
  static assertView(user: PolicyUser) {
    if (!hasActionPermission(user, 'materials', 'view')) throw new ForbiddenError('Você não tem permissão para ver materiais.');
  }

  static assertCreate(user: PolicyUser) {
    if (!hasAnyActionPermission(user, 'materials', ['create', 'manage'])) throw new ForbiddenError('Você não tem permissão para criar materiais.');
  }

  static assertUpdate(user: PolicyUser) {
    if (!hasAnyActionPermission(user, 'materials', ['update', 'manage'])) throw new ForbiddenError('Você não tem permissão para editar materiais.');
  }

  static assertDelete(user: PolicyUser) {
    if (!hasAnyActionPermission(user, 'materials', ['delete', 'manage'])) throw new ForbiddenError('Você não tem permissão para excluir materiais.');
  }

  static assertScope(scope: MaterialScope, teamId: string | null | undefined) {
    if (!scope.allowed || (teamId && !scope.hasGlobalAccess && !scope.accessibleTeamIds.includes(teamId))) {
      throw new ForbiddenError('Sem acesso à equipe deste material.');
    }
  }
}
