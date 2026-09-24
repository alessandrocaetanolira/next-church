import { MemberAccessPolicy } from './member-access.policy';
import { MemberAccessService } from './member-access.service';
import { publishPermissionsUpdated } from '@/infra/sse/sse-broker';

export function updateMemberAccess(
  user: Parameters<typeof MemberAccessPolicy.assertManage>[0],
  service: MemberAccessService,
  memberId: string,
  input: unknown,
  tenantId: string,
) {
  MemberAccessPolicy.assertManage(user);
  return service.update(memberId, input).then((result) => {
    publishPermissionsUpdated(tenantId, result.email, result.role, result.permissions);
    return result;
  });
}
