import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

vi.mock('@/features/auth/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true, user: { id: 'u', tenantId: 't' } }) }));
vi.mock('@/hooks/use-push-subscription', () => ({ usePushSubscription: () => ({ statusChecked: true, supported: true, subscribed: false, permission: 'granted', phase: 'pending', subscribe: vi.fn() }) }));
vi.mock('@/components/providers/AppSettingsProvider', () => ({ useAppSettings: () => ({ settings: { appName: 'Igreja A' } }) }));
vi.mock('@/components/shared/AppLogo', () => ({ AppLogo: () => <div>Logo do tenant</div> }));
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: ReactNode }) => open ? <div role="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
import { PwaOnboarding } from '@/components/pwa/PwaOnboarding';

beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'production'); localStorage.clear();
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('modal inicial de PWA e notificações', () => {
  it('não pede sincronização sem conexão; volta a oferecer ao reconectar', () => {
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    render(<PwaOnboarding />);
    expect(screen.queryByRole('dialog')).toBeNull();
    online.mockReturnValue(true); fireEvent(window, new Event('online'));
    expect(screen.getByText('Sincronizar notificações')).toBeDefined();
    expect(screen.getByText('Logo do tenant')).toBeDefined();
    online.mockReturnValue(false); fireEvent(window, new Event('offline'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
