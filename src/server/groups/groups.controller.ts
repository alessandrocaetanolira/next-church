import { GroupsPolicy } from './groups.policy';
import { GroupsService } from './groups.service';
import type { GroupsRepository } from './groups.repository';

type ControllerContext = { user: Parameters<typeof GroupsPolicy.assertView>[0]; service: GroupsService; repository: GroupsRepository };

export function listGroups({ user, service }: ControllerContext, type: string | null) { GroupsPolicy.assertView(user); return service.list(type); }
export function createGroup({ user, service }: ControllerContext, input: unknown) { GroupsPolicy.assertCreate(user); return service.create(input); }
export function getGroup({ user, service }: ControllerContext, id: string) { GroupsPolicy.assertView(user); return service.get(id); }
export async function updateGroup({ user, service, repository }: ControllerContext, id: string, input: unknown) {
  await GroupsPolicy.assertUpdate(user, repository, id);
  return service.update(id, input);
}
export async function deleteGroup({ user, service, repository }: ControllerContext, id: string) {
  await GroupsPolicy.assertDelete(user, repository, id);
  return service.remove(id);
}
