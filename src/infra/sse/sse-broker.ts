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
export type GlobalProvisioningEvent = {
  type: 'provisioning.updated';
  runId: string;
  tenantId?: string | null;
  status: string;
  step?: string | null;
  message?: string | null;
  finishedAt?: string | null;
};

/** Broker de transporte em memória. A persistência continua no banco. */
export class SseBroker {
  private readonly listeners = new Map<string, Set<SseListener>>();
  private readonly globalListeners = new Map<string, Set<(payload: GlobalProvisioningEvent) => void>>();

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

  subscribeGlobalAdmin(adminId: string, listener: (payload: GlobalProvisioningEvent) => void) {
    const current = this.globalListeners.get(adminId) ?? new Set<(payload: GlobalProvisioningEvent) => void>();
    current.add(listener);
    this.globalListeners.set(adminId, current);
    return () => {
      const listeners = this.globalListeners.get(adminId);
      if (!listeners) return;
      listeners.delete(listener);
      if (listeners.size === 0) this.globalListeners.delete(adminId);
    };
  }

  publishGlobalProvisioning(payload: GlobalProvisioningEvent) {
    let delivered = 0;
    for (const listeners of this.globalListeners.values()) {
      for (const listener of listeners) {
        listener(payload);
        delivered += 1;
      }
    }
    return delivered;
  }

  /** Publica um evento somente para os listeners do destinatário informado. */
  publish(payload: ServerNotificationEvent) {
    const key = `${payload.tenantId}:${payload.userEmail.trim().toLowerCase()}`;
    const listeners = this.listeners.get(key);
    if (!listeners) return 0;
    for (const listener of listeners) {
      listener(payload);
    }
    return listeners.size;
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
  return sseBroker.publish({
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

export function subscribeGlobalAdminEvents(adminId: string, listener: (payload: GlobalProvisioningEvent) => void) {
  return sseBroker.subscribeGlobalAdmin(adminId, listener);
}

export function publishGlobalProvisioningEvent(payload: GlobalProvisioningEvent) {
  return sseBroker.publishGlobalProvisioning(payload);
}
