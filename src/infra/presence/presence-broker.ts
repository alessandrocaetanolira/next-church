export type PresenceRecord = {
  tenantId: string;
  userId: string;
  lastSeenAt: string;
  expiresAt: number;
};

export type PresenceEvent = {
  type: 'presence.updated' | 'presence.removed';
  tenantId: string;
  userId: string;
  lastSeenAt?: string;
};

type PresenceListener = (event: PresenceEvent) => void;

const keyOf = (tenantId: string, userId: string) => `${tenantId}:${userId}`;

/** Estado transitório de presença, sempre particionado pelo tenant. */
export class PresenceBroker {
  private readonly records = new Map<string, PresenceRecord>();
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly listeners = new Map<string, Set<PresenceListener>>();

  constructor(private readonly ttlMs = 90_000) {}

  heartbeat(tenantId: string, userId: string, now = Date.now()) {
    const key = keyOf(tenantId, userId);
    const current = this.records.get(key);
    const lastSeenAt = new Date(now).toISOString();
    const record: PresenceRecord = { tenantId, userId, lastSeenAt, expiresAt: now + this.ttlMs };
    this.records.set(key, record);
    this.scheduleExpiry(record);

    const changed = !current || current.expiresAt <= now;
    if (changed) this.publish({ type: 'presence.updated', tenantId, userId, lastSeenAt });
    return { record, changed };
  }

  list(tenantId: string, now = Date.now()) {
    const records: PresenceRecord[] = [];
    for (const record of this.records.values()) {
      if (record.tenantId !== tenantId) continue;
      if (record.expiresAt <= now) {
        this.expire(record);
        continue;
      }
      records.push(record);
    }
    return records;
  }

  subscribe(tenantId: string, listener: PresenceListener) {
    const listeners = this.listeners.get(tenantId) ?? new Set<PresenceListener>();
    listeners.add(listener);
    this.listeners.set(tenantId, listeners);
    return () => {
      const current = this.listeners.get(tenantId);
      if (!current) return;
      current.delete(listener);
      if (current.size === 0) this.listeners.delete(tenantId);
    };
  }

  private scheduleExpiry(record: PresenceRecord) {
    const key = keyOf(record.tenantId, record.userId);
    const existing = this.timers.get(key);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      const current = this.records.get(key);
      if (!current || current.expiresAt > Date.now()) return;
      this.expire(current);
    }, Math.max(1, record.expiresAt - Date.now()));
    timer.unref?.();
    this.timers.set(key, timer);
  }

  private expire(record: PresenceRecord) {
    const key = keyOf(record.tenantId, record.userId);
    const current = this.records.get(key);
    if (!current || current.expiresAt > Date.now()) return;
    this.records.delete(key);
    const timer = this.timers.get(key);
    if (timer) clearTimeout(timer);
    this.timers.delete(key);
    this.publish({ type: 'presence.removed', tenantId: record.tenantId, userId: record.userId });
  }

  private publish(event: PresenceEvent) {
    for (const listener of this.listeners.get(event.tenantId) ?? []) listener(event);
  }
}

const globalForPresence = globalThis as unknown as { churchPresenceBroker?: PresenceBroker };
export const presenceBroker = globalForPresence.churchPresenceBroker ?? new PresenceBroker();
if (process.env.NODE_ENV !== 'production') globalForPresence.churchPresenceBroker = presenceBroker;
