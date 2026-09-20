import { TeamJoinRequestsPolicy } from './join-requests.policy';
import { TeamJoinRequestsService } from './join-requests.service';
import type { TeamJoinRequestsRepository } from './join-requests.repository';

type User = Parameters<typeof TeamJoinRequestsPolicy.assertView>[0];
type Context = { user: User; service: TeamJoinRequestsService; repository: TeamJoinRequestsRepository };

export function listJoinRequests({ user, service }: Context) { TeamJoinRequestsPolicy.assertView(user); return service.list(user.role, user.linkedMemberId); }
export function createJoinRequest({ user, service }: Context, input: unknown) { TeamJoinRequestsPolicy.assertRequest(user); return service.request(user.linkedMemberId as string, input); }
export async function decideJoinRequest({ user, service, repository }: Context, id: string, action: 'approve' | 'reject') {
  const request = await repository.find(id);
  if (!request) return service.decide(id, action);
  await TeamJoinRequestsPolicy.assertManage(user, repository, request.teamId);
  return service.decide(id, action);
}
