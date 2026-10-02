import { PresenceRepository } from './presence.repository';

export class PresenceService {
  constructor(private readonly repository: PresenceRepository) {}

  heartbeat(tenantId: string, userId: string) {
    const result = this.repository.heartbeat(tenantId, userId);
    return { online: true, userId, lastSeenAt: result.record.lastSeenAt };
  }

  list(tenantId: string) {
    return { presence: this.repository.serialize(this.repository.list(tenantId)) };
  }

  subscribe(tenantId: string, listener: Parameters<PresenceRepository['subscribe']>[1]) {
    return this.repository.subscribe(tenantId, listener);
  }
}
