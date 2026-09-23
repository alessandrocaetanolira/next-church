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
class SseBroker {
  private readonly listeners = new Map<string, Set<SseListener>>();

  subscribe(tenantId: string, listener: SseListener) {
    const current = this.listeners.get(tenantId) ?? new Set<SseListener>();
    current.add(listener);
    this.listeners.set(tenantId, current);

    return () => {
      const listeners = this.listeners.get(tenantId);
      if (!listeners) return;
      listeners.delete(listener);
      if (listeners.size === 0) this.listeners.delete(tenantId);
    };
  }

  publish(payload: ServerNotificationEvent) {
    for (const listener of this.listeners.get(payload.tenantId) ?? []) {
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
  listener: SseListener,
) {
  return sseBroker.subscribe(tenantId, listener);
}

export function publishTenantEvent(payload: ServerNotificationEvent) {
  sseBroker.publish(payload);
}
