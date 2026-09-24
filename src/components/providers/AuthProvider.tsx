"use client";

import { SessionProvider, useSession } from "next-auth/react";
import type { Session } from "next-auth";
import { ReactNode, useEffect, useState } from "react";
import { getAccessibleModules } from '@/lib/access-control';
import { useAuthStore } from '@/features/auth/store';

const OFFLINE_SESSION_KEY = 'church-app-offline-session';

type OfflineSession = Session & {
  user: Session['user'] & {
    id?: string;
    role?: string;
    tenantId?: string;
    tenantSlug?: string;
    permissions?: string[];
    linkedMemberId?: string | null;
    planCode?: string;
    planFeatures?: string[];
    version?: number;
    isPlatformAdmin?: boolean;
  };
};

function readCachedSession(): Session | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(OFFLINE_SESSION_KEY);
    return stored ? JSON.parse(stored) as OfflineSession : null;
  } catch {
    window.localStorage.removeItem(OFFLINE_SESSION_KEY);
    return null;
  }
}

function SessionCacheBridge() {
  const { data: session, status } = useSession();
  const setSession = useAuthStore((state) => state.setSession);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    if (status === 'unauthenticated' && navigator.onLine) {
      window.localStorage.removeItem(OFFLINE_SESSION_KEY);
      logout();
      return;
    }
    if (status !== 'authenticated' || !session) return;
    try {
      const user = session.user as OfflineSession['user'];
      const authUser = {
        id: user.id ?? '',
        name: user.name ?? '',
        email: user.email ?? '',
        role: (user.role ?? 'MEMBER').toUpperCase() as 'ADMIN' | 'PASTOR' | 'LEADER' | 'MEMBER',
        permissions: user.permissions ?? [],
        churchId: user.tenantId ?? '',
        tenantId: user.tenantId ?? '',
        linkedMemberId: user.linkedMemberId,
        isPlatformAdmin: user.isPlatformAdmin,
        planCode: user.planCode,
        planFeatures: user.planFeatures,
        accessibleModules: [...getAccessibleModules(user)],
      };
      // A store é atualizada sempre que o Auth.js renova ou altera a sessão,
      // incluindo mudanças de papel e permissões sem exigir logout.
      setSession(authUser, user.tenantId ?? null);
      const snapshot: OfflineSession = {
        expires: session.expires,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
          tenantSlug: user.tenantSlug,
          permissions: user.permissions,
          linkedMemberId: user.linkedMemberId,
          planCode: user.planCode,
          planFeatures: user.planFeatures,
          version: user.version,
          isPlatformAdmin: user.isPlatformAdmin,
        },
      };
      window.localStorage.setItem(OFFLINE_SESSION_KEY, JSON.stringify(snapshot));
    } catch {
      // O cache da sessão é opcional; a sessão online continua funcionando.
    }
  }, [logout, session, setSession, status]);

  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Nunca injeta uma sessão antiga durante um acesso online: o Auth.js precisa
  // validar a sessão atual no servidor para evitar login preso ou usuário stale.
  const [cachedSession] = useState<Session | null>(() => (
    typeof navigator !== 'undefined' && !navigator.onLine ? readCachedSession() : null
  ));

  const content = <>
    <SessionCacheBridge />
    {children}
  </>;

  // `session={null}` é diferente de não informar `session`: o NextAuth entende
  // null como uma sessão já inicializada e pode deixar de consultar o servidor.
  if (cachedSession) {
    return <SessionProvider session={cachedSession} refetchOnWindowFocus={false} refetchInterval={0}>{content}</SessionProvider>;
  }

  return <SessionProvider refetchOnWindowFocus={false} refetchInterval={0}>{content}</SessionProvider>;
}
