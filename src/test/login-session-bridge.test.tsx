import type { ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const runtime = vi.hoisted(() => ({
  signOut: vi.fn(), logout: vi.fn(), clearCachedSession: vi.fn(), refresh: vi.fn(),
  session: { user: { id: 'old-user', authValid: false, isPlatformAdmin: true, tenantSlug: 'igreja-antiga' } },
}));
vi.mock('next-auth/react', () => ({
  SessionProvider: ({ children }: { children: ReactNode }) => children,
  useSession: () => ({ data: runtime.session, status: 'authenticated' }),
  signOut: runtime.signOut,
}));
vi.mock('@/features/auth/store', () => ({ useAuthStore: (selector: (value: unknown) => unknown) => selector({ logout: runtime.logout, setSession: vi.fn() }) }));
vi.mock('@/lib/access-control', () => ({ getAccessibleModules: () => new Set() }));
vi.mock('@/lib/offline-session', () => ({ clearCachedSession: runtime.clearCachedSession, readCachedSession: vi.fn(), writeCachedSession: vi.fn() }));
vi.mock('@/lib/mobile-resume-diagnostics', () => ({ logMobileResume: vi.fn() }));
vi.mock('@/features/auth/session-refresh', () => ({
  SessionRefreshProvider: ({ children }: { children: ReactNode }) => children,
  useSessionRefresh: () => runtime.refresh,
}));
import { AuthProvider } from '@/components/providers/AuthProvider';

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); window.history.replaceState(null, '', '/'); });

describe('sessão antiga nas telas de login', () => {
  it.each(['/admin/login', '/auth/login?igreja=igreja-a'])('preserva %s sem iniciar um logout que dispute a nova autenticação', (url) => {
    window.history.replaceState(null, '', url);
    render(<AuthProvider><p>Formulário de login</p></AuthProvider>);
    expect(screen.getByText('Formulário de login')).toBeDefined();
    expect(window.location.pathname).toBe(url.split('?')[0]);
    expect(runtime.clearCachedSession).toHaveBeenCalled();
    expect(runtime.logout).toHaveBeenCalled();
    expect(runtime.signOut).not.toHaveBeenCalled();
  });
});
