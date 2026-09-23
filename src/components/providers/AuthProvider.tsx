"use client";

import { SessionProvider, useSession } from "next-auth/react";
import type { Session } from "next-auth";
import { ReactNode, useEffect, useState } from "react";

const OFFLINE_SESSION_KEY = 'church-app-offline-session';

function readCachedSession(): Session | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(OFFLINE_SESSION_KEY);
    return stored ? JSON.parse(stored) as Session : null;
  } catch {
    window.localStorage.removeItem(OFFLINE_SESSION_KEY);
    return null;
  }
}

function SessionCacheBridge() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'unauthenticated' && navigator.onLine) {
      window.localStorage.removeItem(OFFLINE_SESSION_KEY);
      return;
    }
    if (status !== 'authenticated' || !session) return;
    try {
      window.localStorage.setItem(OFFLINE_SESSION_KEY, JSON.stringify(session));
    } catch {
      // O cache da sessão é opcional; a sessão online continua funcionando.
    }
  }, [session, status]);

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
