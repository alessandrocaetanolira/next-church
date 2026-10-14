import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/features/auth/store';

vi.mock('next-auth/react', () => ({ useSession: () => ({ data: null, status: 'unauthenticated', update: vi.fn() }), signOut: vi.fn() }));
vi.mock('next/navigation', () => ({ usePathname: () => '/offline' }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => true }));
vi.mock('@/hooks/use-mobile-viewport', () => ({ useMobileViewport: vi.fn() }));
vi.mock('@/components/layout/Header', () => ({ Header: () => <header>Topbar</header> }));
vi.mock('@/components/layout/BottomNav', () => ({ BottomNav: () => <nav aria-label="Navegação principal">Navbottom</nav> }));
vi.mock('@/components/layout/templates/WebTemplate', () => ({ WebTemplate: () => null }));
vi.mock('@/components/providers/NotificationsProvider', () => ({ NotificationsProvider: () => null }));
vi.mock('@/components/ui/sonner', () => ({ Toaster: () => null }));

import { LayoutWrapper } from '@/components/layout/LayoutWrapper';
import OfflinePage from '@/app/offline/page';

beforeEach(() => {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  useAuthStore.getState().logout();
});
afterEach(() => { cleanup(); useAuthStore.getState().logout(); vi.restoreAllMocks(); });

describe('shell do fallback offline', () => {
  it('mantém topbar e navbottom com usuário salvo e aviso apenas no conteúdo', () => {
    useAuthStore.getState().setSession({
      id: 'member-a', name: 'Membro', email: 'member@local', role: 'MEMBER',
      churchId: 'tenant-a', tenantId: 'tenant-a', permissions: [], teamIds: [], accessibleModules: [],
    }, 'tenant-a');
    render(<LayoutWrapper><OfflinePage /></LayoutWrapper>);
    expect(screen.getByText('Topbar')).toBeDefined();
    expect(screen.getByRole('navigation', { name: 'Navegação principal' })).toBeDefined();
    const fallback = screen.getByRole('region', { name: 'Página indisponível offline' });
    expect(fallback.closest('main')?.classList.contains('mobile-main')).toBe(true);
    expect(fallback.className).not.toContain('min-h-screen');
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Abrir Bíblia offline' }).getAttribute('href')).toBe('/bible');
  });

  it('não inventa sessão ou navegação administrativa quando não há usuário salvo', () => {
    render(<LayoutWrapper><OfflinePage /></LayoutWrapper>);
    expect(screen.queryByRole('navigation')).toBeNull();
    expect(screen.queryByText('Topbar')).toBeNull();
    expect(screen.getByText('Você está offline')).toBeDefined();
  });
});
