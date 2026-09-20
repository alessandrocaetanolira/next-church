import { MemberAccessPolicy } from './member-access.policy';
import { MemberAccessService } from './member-access.service';

export function updateMemberAccess(
  user: Parameters<typeof MemberAccessPolicy.assertManage>[0],
  service: MemberAccessService,
  memberId: string,
  input: unknown,
) {
  MemberAccessPolicy.assertManage(user);
  return service.update(memberId, input);
}
