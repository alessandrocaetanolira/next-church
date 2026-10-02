import { ValidationError } from '@/lib/http/errors';
import { PresencePolicy } from './presence.policy';
import { PresenceRepository } from './presence.repository';
import { PresenceService } from './presence.service';

type Context = {
  user: (Parameters<typeof PresencePolicy.assertView>[0] & { id?: string | null }) | null | undefined;
  tenantId: string;
  service: PresenceService;
};

export function createPresenceService() {
  return new PresenceService(new PresenceRepository());
}

export function heartbeatPresence({ user, tenantId, service }: Context) {
  if (!user?.id) throw new ValidationError('Usuário não identificado.');
  return service.heartbeat(tenantId, user.id);
}

export function listPresence({ user, tenantId, service }: Context) {
  PresencePolicy.assertView(user);
  return service.list(tenantId);
}

export function subscribePresence({ user, tenantId, service }: Context, listener: Parameters<PresenceService['subscribe']>[1]) {
  PresencePolicy.assertView(user);
  return service.subscribe(tenantId, listener);
}
