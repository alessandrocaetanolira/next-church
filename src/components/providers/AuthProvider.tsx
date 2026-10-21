"use client";

import { SessionProvider, signOut, useSession } from "next-auth/react";
import type { Session } from "next-auth";
import { ReactNode, useEffect, useRef, useState } from "react";
import { getAccessibleModules } from '@/lib/access-control';
import { useAuthStore } from '@/features/auth/store';
import { clearCachedSession, readCachedSession, writeCachedSession } from '@/lib/offline-session';
import { SessionRefreshProvider, useSessionRefresh } from '@/features/auth/session-refresh';
import { logMobileResume } from '@/lib/mobile-resume-diagnostics';
import { getLoginUrl, isLoginRoute } from '@/lib/login-routing';

type OfflineSession = Session & {
  user: Session['user'] & {
    id?: string;
    role?: string;
    tenantId?: string;
    tenantSlug?: string;
    permissions?: string[];
    linkedMemberId?: string | null;
    teamIds?: string[];
    planCode?: string;
    planFeatures?: string[];
    version?: number;
    isPlatformAdmin?: boolean;
  };
};

function SessionCacheBridge() {
  const { data: session, status } = useSession();
  const refreshSession = useSessionRefresh();
  const revoking = useRef(false);
  const setSession = useAuthStore((state) => state.setSession);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    if (session?.user?.authValid === false) {
      clearCachedSession();
      logout();
      // Uma sessão antiga não deve expulsar o usuário do login escolhido,
      // nem disputar a gravação de cookies com uma nova autenticação.
      if (isLoginRoute(window.location.pathname)) return;
      if (!revoking.current) {
        revoking.current = true;
        const loginUrl = getLoginUrl({ pathname: window.location.pathname, isPlatformAdmin: session.user.isPlatformAdmin, tenantSlug: session.user.tenantSlug });
        const redirect = () => {
          if (!isLoginRoute(window.location.pathname)) window.location.replace(loginUrl);
        };
        void signOut({ redirect: false }).then(redirect, redirect);
      }
      return;
    }
    if (status === 'unauthenticated' && navigator.onLine) {
      clearCachedSession();
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
        role: (user.role ?? 'MEMBER').toUpperCase() as 'ADMIN' | 'PASTOR' | 'LEADER' | 'CANTEEN' | 'MEMBER',
        permissions: user.permissions ?? [],
        churchId: user.tenantId ?? '',
        tenantId: user.tenantId ?? '',
        tenantSlug: user.tenantSlug,
        linkedMemberId: user.linkedMemberId,
        teamIds: user.teamIds ?? [],
        isPlatformAdmin: user.isPlatformAdmin,
        planCode: user.planCode,
        planFeatures: user.planFeatures,
        accessUpdatedAt: undefined,
        image: user.image,
        version: user.version ?? 0,
        accessibleModules: [...getAccessibleModules(user)],
      };
      // A store é atualizada sempre que o Auth.js renova ou altera a sessão,
      // incluindo mudanças de papel e permissões sem exigir logout.
      setSession(authUser, user.tenantId ?? null);
      const reconciled = useAuthStore.getState().user;
      const snapshot: OfflineSession = {
        expires: session.expires,
        user: {
          id: user.id,
          name: user.name,
          image: user.image,
          email: user.email,
          role: reconciled?.role ?? user.role,
          tenantId: user.tenantId,
          tenantSlug: user.tenantSlug,
          permissions: reconciled?.permissions ?? user.permissions,
          linkedMemberId: user.linkedMemberId,
          teamIds: reconciled?.teamIds ?? user.teamIds ?? [],
          planCode: user.planCode,
          planFeatures: reconciled?.planFeatures ?? user.planFeatures,
          version: reconciled?.version ?? user.version,
          isPlatformAdmin: user.isPlatformAdmin,
        },
      };
      writeCachedSession(snapshot);
    } catch {
      // O cache da sessão é opcional; a sessão online continua funcionando.
    }
  }, [logout, session, setSession, status]);

  useEffect(() => {
    logMobileResume('session-state', { status, role: session?.user?.role, version: session?.user?.version });
  }, [session, status]);

  useEffect(() => {
    const revalidateOnResume = () => {
      if (document.visibilityState !== 'visible' || !navigator.onLine) return;
      void refreshSession?.().catch(() => undefined);
    };

    document.addEventListener('visibilitychange', revalidateOnResume);
    window.addEventListener('pageshow', revalidateOnResume);
    window.addEventListener('online', revalidateOnResume);
    return () => {
      document.removeEventListener('visibilitychange', revalidateOnResume);
      window.removeEventListener('pageshow', revalidateOnResume);
      window.removeEventListener('online', revalidateOnResume);
    };
  }, [refreshSession]);

  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Nunca injeta uma sessão antiga durante um acesso online: o Auth.js precisa
  // validar a sessão atual no servidor para evitar login preso ou usuário stale.
  const [cachedSession] = useState<Session | null>(() => (
    typeof navigator !== 'undefined' && !navigator.onLine ? readCachedSession() : null
  ));

  const content = <SessionRefreshProvider>
    <SessionCacheBridge />
    {children}
  </SessionRefreshProvider>;

  // `session={null}` é diferente de não informar `session`: o NextAuth entende
  // null como uma sessão já inicializada e pode deixar de consultar o servidor.
  if (cachedSession) {
    return <SessionProvider session={cachedSession} refetchOnWindowFocus={false} refetchInterval={0}>{content}</SessionProvider>;
  }

  return <SessionProvider refetchOnWindowFocus={false} refetchInterval={0}>{content}</SessionProvider>;
}
