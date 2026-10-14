'use client';

import { createContext, useCallback, useContext, useLayoutEffect, useRef, type ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import type { Session } from 'next-auth';

type RefreshOptions = { afterCurrent?: boolean };
type Refresh = (options?: RefreshOptions) => Promise<Session | null | undefined>;
const SessionRefreshContext = createContext<Refresh | null>(null);

/** Coalesces resume events; an access event requests one fresh read after an in-flight read. */
export function createSessionRevalidator<T>(identity: () => string | null, load: () => Promise<T>) {
  let active: Promise<T | undefined> | null = null;
  let queued = false;
  return (options: RefreshOptions = {}): Promise<T | undefined> => {
    const owner = identity();
    if (!owner) return Promise.resolve(undefined);
    if (active) {
      queued ||= Boolean(options.afterCurrent);
      return active;
    }
    active = (async () => {
      let result: T | undefined;
      do {
        queued = false;
        // Auth.js changes its update callback during loading. Let React commit before another read.
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        if (identity() !== owner) return undefined;
        result = await load();
        if (identity() !== owner) return undefined;
      } while (queued);
      return result;
    })().finally(() => { active = null; queued = false; });
    return active;
  };
}

/** A single revalidation coordinator per SessionProvider, shared by resume and SSE. */
export function SessionRefreshProvider({ children }: { children: ReactNode }) {
  const { data: session, update } = useSession();
  const latest = useRef({ session, update });
  useLayoutEffect(() => { latest.current = { session, update }; }, [session, update]);
  const coordinator = useRef<ReturnType<typeof createSessionRevalidator<Session | null | undefined>> | null>(null);
  const refresh = useCallback<Refresh>((options) => {
    if (coordinator.current === null) {
      coordinator.current = createSessionRevalidator(() => {
        const user = latest.current.session?.user;
        return user?.id && user.authValid !== false
          ? JSON.stringify([user.id, user.tenantId, Boolean(user.isPlatformAdmin)]) : null;
      }, () => latest.current.update());
    }
    return coordinator.current(options);
  }, []);
  return <SessionRefreshContext.Provider value={refresh}>{children}</SessionRefreshContext.Provider>;
}

export const useSessionRefresh = () => useContext(SessionRefreshContext);
