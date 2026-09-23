import { getTenantClient } from '@/lib/prisma-factory';
import { PushSubscriptionsRepository } from './push-subscriptions.repository';
import { pushSubscriptionSchema, PushSubscriptionsService } from './push-subscriptions.service';

export async function registerPushSubscription(tenantId: string, email: string, body: unknown) {
  const input = pushSubscriptionSchema.parse(body);
  const service = new PushSubscriptionsService(new PushSubscriptionsRepository(getTenantClient(tenantId)));
  await service.register(email, input);
  return { ok: true as const };
}

export async function removePushSubscription(tenantId: string, email: string, body: unknown) {
  const endpoint = pushSubscriptionSchema.shape.endpoint.parse((body as { endpoint?: unknown })?.endpoint);
  const service = new PushSubscriptionsService(new PushSubscriptionsRepository(getTenantClient(tenantId)));
  await service.remove(email, endpoint);
  return { ok: true as const };
}
