import { KidsPolicy } from './kids.policy';
import { KidsService } from './kids.service';

type User = Parameters<typeof KidsPolicy.assertView>[0];

export function listKids(user: User, service: KidsService) { KidsPolicy.assertView(user); return service.list(); }
export function createKid(user: User, service: KidsService, input: unknown) { KidsPolicy.assertManage(user, 'create'); return service.create(input); }
export function updateKid(user: User, service: KidsService, id: string, input: unknown) { KidsPolicy.assertManage(user, 'update'); return service.update(id, input); }
export function deleteKid(user: User, service: KidsService, id: string) { KidsPolicy.assertManage(user, 'delete'); return service.remove(id); }
export function notifyKid(user: User, service: KidsService, id: string, input: unknown, actorName: string) { KidsPolicy.assertManage(user, 'update'); return service.notify(id, input, actorName); }
