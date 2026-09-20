import { MaterialsPolicy } from './materials.policy';
import type { MaterialScope } from './materials.policy';
import { MaterialsService } from './materials.service';
import type { MaterialsRepository } from './materials.repository';

type ControllerContext = { user: Parameters<typeof MaterialsPolicy.assertView>[0]; service: MaterialsService; repository: MaterialsRepository; scope: MaterialScope };

function inputTeamId(input: unknown) {
  return input && typeof input === 'object' && typeof (input as { teamId?: unknown }).teamId === 'string' ? (input as { teamId: string }).teamId.trim() : null;
}

export function listMaterials({ user, service, scope }: ControllerContext) { MaterialsPolicy.assertView(user); MaterialsPolicy.assertScope(scope, null); return service.list(scope.hasGlobalAccess ? undefined : scope.accessibleTeamIds); }
export function createMaterial({ user, service, scope }: ControllerContext, input: unknown) { MaterialsPolicy.assertCreate(user); MaterialsPolicy.assertScope(scope, inputTeamId(input)); return service.create(input); }
export async function updateMaterial({ user, service, repository, scope }: ControllerContext, id: string, input: unknown) { MaterialsPolicy.assertUpdate(user); MaterialsPolicy.assertScope(scope, inputTeamId(input) ?? await repository.findTeamId(id)); return service.update(id, input); }
export async function updateMaterialQuantity({ user, service, repository, scope }: ControllerContext, id: string, input: unknown) { MaterialsPolicy.assertUpdate(user); MaterialsPolicy.assertScope(scope, await repository.findTeamId(id)); return service.updateQuantity(id, input); }
export async function deleteMaterial({ user, service, repository, scope }: ControllerContext, id: string) { MaterialsPolicy.assertDelete(user); MaterialsPolicy.assertScope(scope, await repository.findTeamId(id)); return service.remove(id); }
