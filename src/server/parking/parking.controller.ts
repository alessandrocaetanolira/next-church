import { ParkingPolicy } from './parking.policy';
import { ParkingService } from './parking.service';

type User = Parameters<typeof ParkingPolicy.assertView>[0];

export function listParking(user: User, service: ParkingService, groupId: string | null) { ParkingPolicy.assertView(user); return service.list(groupId); }
export function createParking(user: User, service: ParkingService, input: unknown) { ParkingPolicy.assertManage(user, 'create'); return service.create(input); }
export function updateParking(user: User, service: ParkingService, id: string, input: unknown, partial = false) { ParkingPolicy.assertManage(user, 'update'); return service.update(id, input, partial); }
export function deleteParking(user: User, service: ParkingService, id: string) { ParkingPolicy.assertManage(user, 'delete'); return service.remove(id); }
export function notifyParking(user: User, service: ParkingService, id: string, input: unknown, actorName: string) { ParkingPolicy.assertManage(user, 'update'); return service.notify(id, input, actorName); }
