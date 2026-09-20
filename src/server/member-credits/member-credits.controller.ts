import { MemberCreditsPolicy } from './member-credits.policy';
import { MemberCreditsService } from './member-credits.service';

export function syncMemberCredits(user: Parameters<typeof MemberCreditsPolicy.assertSync>[0], service: MemberCreditsService, input: unknown, createdBy: string) {
  MemberCreditsPolicy.assertSync(user);
  return service.sync(input, createdBy);
}
