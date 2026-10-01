import { getGlobalClient } from '@/lib/prisma-factory';
import { PlatformPushService, platformPushSubscriptionSchema } from './platform-push.service';

const service = () => new PlatformPushService(getGlobalClient());

export async function registerPlatformPushSubscription(adminId: string, body: unknown) {
  await service().register(adminId, platformPushSubscriptionSchema.parse(body));
  return { ok: true as const };
}

export async function removePlatformPushSubscription(adminId: string, body: unknown) {
  const endpoint = platformPushSubscriptionSchema.shape.endpoint.parse((body as { endpoint?: unknown })?.endpoint);
  await service().remove(adminId, endpoint);
  return { ok: true as const };
}

export function notifyPlatformAdmin(adminId: string, input: { type: string; title: string; message: string; href?: string }) {
  return service().notify(adminId, input);
}
