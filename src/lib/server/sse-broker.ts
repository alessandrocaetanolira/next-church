type SseListener = (payload: ServerNotificationEvent) => void;

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

const tenantListeners = new Map<string, Set<SseListener>>();

export function subscribeToTenantEvents(tenantId: string, listener: SseListener) {
  const listeners = tenantListeners.get(tenantId) ?? new Set<SseListener>();
  listeners.add(listener);
  tenantListeners.set(tenantId, listeners);

  return () => {
    const current = tenantListeners.get(tenantId);
    if (!current) return;
    current.delete(listener);
    if (current.size === 0) {
      tenantListeners.delete(tenantId);
    }
  };
}

export function publishTenantEvent(payload: ServerNotificationEvent) {
  const listeners = tenantListeners.get(payload.tenantId);
  if (!listeners?.size) return;
  listeners.forEach((listener) => listener(payload));
}
