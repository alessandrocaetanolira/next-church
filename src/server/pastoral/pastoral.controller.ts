import { PastoralPolicy } from './pastoral.policy';
import { PastoralService } from './pastoral.service';

type User = Parameters<typeof PastoralPolicy.assertView>[0];

export function listPendingMembers(user: User, service: PastoralService) {
  PastoralPolicy.assertView(user);
  return service.listPending();
}

export function approveMember(user: User, service: PastoralService, id: string) {
  PastoralPolicy.assertApprove(user);
  return service.approve(id);
}

export function rejectMember(user: User, service: PastoralService, id: string) {
  PastoralPolicy.assertReject(user);
  return service.reject(id);
}
