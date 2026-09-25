/**
 * Evento de notificação entregue em tempo real para um único usuário.
 *
 * O broker conhece apenas o tenant e o destinatário. Ele não conhece regras
 * de cantina, feed ou qualquer outro módulo de negócio.
 */
export type ServerNotificationEvent = {
  id: string;
  tenantId: string;
  userEmail: string;
  senderEmail?: string | null;
  senderName?: string | null;
  type: string;
  title: string;
  message: string;
  href?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
  createdAt: string;
  role?: string;
  permissions?: string[];
};

export type ServerTenantEvent = ServerNotificationEvent;

type SseListener = (payload: ServerTenantEvent) => void;

/** Broker de transporte em memória. A persistência continua no banco. */
export class SseBroker {
  private readonly listeners = new Map<string, Set<SseListener>>();

  /**
   * Inscreve um cliente no canal privado do usuário dentro do tenant.
   * @returns função idempotente de cancelamento da inscrição.
   */
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

  /** Publica um evento somente para os listeners do destinatário informado. */
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

/** Mantém a API de transporte independente dos módulos de negócio. */
export function subscribeToTenantEvents(
  tenantId: string,
  userEmail: string,
  listener: SseListener,
) {
  return sseBroker.subscribe(tenantId, userEmail, listener);
}

export function publishPermissionsUpdated(
  tenantId: string,
  userEmail: string,
  role: string,
  permissions: string[],
) {
  sseBroker.publish({
    id: `permissions:${userEmail}:${Date.now()}`,
    tenantId,
    userEmail,
    type: 'permissions.updated',
    title: '',
    message: '',
    role,
    permissions,
    createdAt: new Date().toISOString(),
  });
}

/** Publica uma notificação já persistida no canal SSE do destinatário. */
export function publishTenantEvent(payload: ServerNotificationEvent) {
  sseBroker.publish(payload);
}
