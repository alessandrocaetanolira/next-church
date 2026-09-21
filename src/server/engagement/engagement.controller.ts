import { EngagementPolicy } from './engagement.policy';
import { EngagementService } from './engagement.service';

type User = Parameters<typeof EngagementPolicy.assertAccess>[0];

export function getEngagement(user: User, service: EngagementService) { EngagementPolicy.assertAccess(user); return service.get(user?.email as string); }
export function updateEngagement(user: User, service: EngagementService, input: unknown) { EngagementPolicy.assertAccess(user); return service.update(user?.email as string, input); }
