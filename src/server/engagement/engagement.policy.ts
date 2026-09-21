import { hasPlanFeature } from '@/lib/access-control';
import { ForbiddenError } from '@/lib/http/errors';

type PolicyUser = Parameters<typeof hasPlanFeature>[0];

export class EngagementPolicy {
  static assertAccess(user: PolicyUser) { if (!hasPlanFeature(user, 'engagement')) throw new ForbiddenError('Recurso não disponível no plano.'); }
}
