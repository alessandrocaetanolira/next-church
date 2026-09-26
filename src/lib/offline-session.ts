import type { Session } from 'next-auth';

const LEGACY_SESSION_KEY = 'church-app-offline-session';
const SESSION_POINTER_KEY = 'church-app-offline-session-pointer';

type SessionUser = Session['user'] & {
  id?: string;
  tenantId?: string;
};

type SessionSnapshot = Session & { user: SessionUser };

function getContext(session: SessionSnapshot | null | undefined) {
  const tenantId = session?.user?.tenantId?.trim();
  const userId = session?.user?.id?.trim();
  return tenantId && userId ? { tenantId, userId } : null;
}

export function getOfflineSessionKey(tenantId: string, userId: string) {
  return `church-app-offline-session:${encodeURIComponent(tenantId)}:${encodeURIComponent(userId)}`;
}

export function readCachedSession(): Session | null {
  if (typeof window === 'undefined') return null;

  try {
    const pointer = window.localStorage.getItem(SESSION_POINTER_KEY);
    if (pointer) {
      const context = JSON.parse(pointer) as { tenantId?: string; userId?: string };
      if (context.tenantId && context.userId) {
        const scoped = window.localStorage.getItem(getOfflineSessionKey(context.tenantId, context.userId));
        if (scoped) return JSON.parse(scoped) as SessionSnapshot;
      }
    }

    // Migração única do cache anterior, sem manter uma chave global ativa.
    const legacy = window.localStorage.getItem(LEGACY_SESSION_KEY);
    if (!legacy) return null;
    const session = JSON.parse(legacy) as SessionSnapshot;
    const context = getContext(session);
    if (!context) return null;
    window.localStorage.setItem(getOfflineSessionKey(context.tenantId, context.userId), legacy);
    window.localStorage.setItem(SESSION_POINTER_KEY, JSON.stringify(context));
    window.localStorage.removeItem(LEGACY_SESSION_KEY);
    return session;
  } catch {
    clearCachedSession();
    return null;
  }
}

export function writeCachedSession(session: SessionSnapshot) {
  if (typeof window === 'undefined') return;
  const context = getContext(session);
  if (!context) return;
  window.localStorage.setItem(getOfflineSessionKey(context.tenantId, context.userId), JSON.stringify(session));
  window.localStorage.setItem(SESSION_POINTER_KEY, JSON.stringify(context));
  window.localStorage.removeItem(LEGACY_SESSION_KEY);
}

export function clearCachedSession() {
  if (typeof window === 'undefined') return;
  try {
    const pointer = window.localStorage.getItem(SESSION_POINTER_KEY);
    if (pointer) {
      const context = JSON.parse(pointer) as { tenantId?: string; userId?: string };
      if (context.tenantId && context.userId) {
        window.localStorage.removeItem(getOfflineSessionKey(context.tenantId, context.userId));
      }
    }
  } catch {
    // Um ponteiro corrompido não deve impedir a limpeza do cache local.
  } finally {
    window.localStorage.removeItem(SESSION_POINTER_KEY);
    window.localStorage.removeItem(LEGACY_SESSION_KEY);
  }
}
