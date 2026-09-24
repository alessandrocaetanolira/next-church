export type ServerNotificationEvent = {
  id: string;
  tenantId: string;
  userEmail: string;
  type: string;
  title: string;
  message: string;
  href?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
  createdAt: string;
};

type SseListener = (payload: ServerNotificationEvent) => void;

/** Broker de transporte em memória. A persistência continua no banco. */
export class SseBroker {
  private readonly listeners = new Map<string, Set<SseListener>>();

  subscribe(tenantId: string, userEmail: string, listener: SseListener) {
    const key = `${tenantId}:${userEmail.trim().toLowerCase()}`;
    const current = this.listeners.get(key) ?? new Set<SseListener>();
    current.add(listener);
    this.listeners.set(key, current);

    return () => {
      const listeners = this.listeners.get(key);
      if (!listeners) return;
      listeners.delete(listener);
      if (listeners.size === 0) this.listeners.delete(key);
    };
  }

  publish(payload: ServerNotificationEvent) {
    const key = `${payload.tenantId}:${payload.userEmail.trim().toLowerCase()}`;
    for (const listener of this.listeners.get(key) ?? []) {
      listener(payload);
    }
  }
}

const globalForSse = globalThis as unknown as { churchSseBroker?: SseBroker };
export const sseBroker = globalForSse.churchSseBroker ?? new SseBroker();

if (process.env.NODE_ENV !== 'production') {
  globalForSse.churchSseBroker = sseBroker;
}

export function subscribeToTenantEvents(
  tenantId: string,
  userEmail: string,
  listener: SseListener,
) {
  return sseBroker.subscribe(tenantId, userEmail, listener);
}

export function publishTenantEvent(payload: ServerNotificationEvent) {
  sseBroker.publish(payload);
}
