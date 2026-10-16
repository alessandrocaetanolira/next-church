import { TasksPolicy } from './tasks.policy';
import type { TaskScope } from './tasks.policy';
import { TasksService } from './tasks.service';
import type { TasksRepository } from './tasks.repository';

type ControllerContext = { user: Parameters<typeof TasksPolicy.assertView>[0]; service: TasksService; repository: TasksRepository; scope: TaskScope };

function inputTeamId(input: unknown) {
  return input && typeof input === 'object' && typeof (input as { teamId?: unknown }).teamId === 'string'
    ? (input as { teamId: string }).teamId.trim()
    : null;
}

export function listTasks({ user, service, scope }: ControllerContext) {
  TasksPolicy.assertView(user);
  TasksPolicy.assertScope(scope, scope.hasGlobalAccess ? null : scope.accessibleTeamIds[0]);
  return service.list(scope.hasGlobalAccess ? undefined : scope.accessibleTeamIds);
}

export function createTask({ user, service, scope }: ControllerContext, input: unknown) {
  TasksPolicy.assertCreate(user);
  TasksPolicy.assertScope(scope, inputTeamId(input));
  return service.create(input);
}

export async function syncTask({ user, service, repository, scope }: ControllerContext, action: 'create' | 'update' | 'delete', input: unknown) {
  if (action === 'create') TasksPolicy.assertCreate(user);
  if (action === 'update') TasksPolicy.assertUpdate(user);
  if (action === 'delete') TasksPolicy.assertDelete(user);
  const currentTeamId = (typeof input === 'object' && input && typeof (input as { id?: unknown }).id === 'string'
    ? await repository.findTeamId((input as { id: string }).id)
    : null);
  if (currentTeamId) TasksPolicy.assertScope(scope, currentTeamId);
  TasksPolicy.assertScope(scope, action === 'delete' ? currentTeamId : inputTeamId(input) ?? currentTeamId);
  return service.sync(action, input);
}
