import { MembersPolicy } from './members.policy';
import { MembersService } from './members.service';

type ControllerContext = { user: Parameters<typeof MembersPolicy.assert>[0]; service: MembersService };

export function listMembers({ user, service }: ControllerContext) { MembersPolicy.assert(user, 'view'); return service.list(); }
export function getMember({ user, service }: ControllerContext, id: string) { MembersPolicy.assert(user, 'view'); return service.get(id); }
export function createMember({ user, service }: ControllerContext, input: unknown) { MembersPolicy.assert(user, 'create'); return service.create(input); }
export function updateMember({ user, service }: ControllerContext, id: string, input: unknown) { MembersPolicy.assert(user, 'update'); return service.update(id, input); }
export function deleteMember({ user, service }: ControllerContext, id: string) { MembersPolicy.assert(user, 'delete'); return service.remove(id); }
