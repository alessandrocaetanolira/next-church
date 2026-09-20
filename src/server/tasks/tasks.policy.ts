import { hasActionPermission } from '@/lib/access-control';
import { ForbiddenError } from '@/lib/http/errors';

type PolicyUser = Parameters<typeof hasActionPermission>[0];

export type TaskScope = { allowed: boolean; hasGlobalAccess: boolean; accessibleTeamIds: string[] };

export class TasksPolicy {
  static assertView(user: PolicyUser) {
    if (!hasActionPermission(user, 'tasks', 'view')) throw new ForbiddenError('Sem permissão para consultar tarefas.');
  }

  static assertCreate(user: PolicyUser) {
    if (!hasActionPermission(user, 'tasks', 'create')) throw new ForbiddenError('Sem permissão para criar tarefas.');
  }

  static assertUpdate(user: PolicyUser) {
    if (!hasActionPermission(user, 'tasks', 'update')) throw new ForbiddenError('Sem permissão para atualizar tarefas.');
  }

  static assertDelete(user: PolicyUser) {
    if (!hasActionPermission(user, 'tasks', 'delete')) throw new ForbiddenError('Sem permissão para excluir tarefas.');
  }

  static assertScope(scope: TaskScope, teamId: string | null | undefined) {
    if (!scope.allowed || (!scope.hasGlobalAccess && (!teamId || !scope.accessibleTeamIds.includes(teamId)))) {
      throw new ForbiddenError('Sem acesso à equipe desta tarefa.');
    }
  }
}
