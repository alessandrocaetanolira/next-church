import { presenceBroker, type PresenceEvent, type PresenceRecord } from '@/infra/presence/presence-broker';

export class PresenceRepository {
  heartbeat(tenantId: string, userId: string) {
    return presenceBroker.heartbeat(tenantId, userId);
  }

  list(tenantId: string) {
    return presenceBroker.list(tenantId);
  }

  subscribe(tenantId: string, listener: (event: PresenceEvent) => void) {
    return presenceBroker.subscribe(tenantId, listener);
  }

  serialize(records: PresenceRecord[]) {
    return records.map(({ userId, lastSeenAt }) => ({ userId, lastSeenAt }));
  }
}
