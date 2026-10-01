import { MemberAccessPolicy } from './member-access.policy';
import { MemberAccessService } from './member-access.service';
import { publishPermissionsUpdated } from '@/infra/sse/sse-broker';
import { MemberAccessNotifier } from './member-access-notifier';

export function updateMemberAccess(
  user: Parameters<typeof MemberAccessPolicy.assertManage>[0],
  service: MemberAccessService,
  memberId: string,
  input: unknown,
  tenantId: string,
  notifier?: MemberAccessNotifier,
) {
  MemberAccessPolicy.assertManage(user);
  return service.update(memberId, input).then(async (result) => {
    const listeners = publishPermissionsUpdated(tenantId, result.email, result.role, result.permissions);
    if (listeners === 0 && notifier) await notifier.sendOfflineFallback(result.email);
    return result;
  });
}
