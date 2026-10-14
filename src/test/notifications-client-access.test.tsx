import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from 'next-auth';
import type { NotificationStreamPayload } from '@/services/notification-stream';
import { useAuthStore, type User } from '@/features/auth/store';

const runtime = vi.hoisted(() => ({ session: null as Session | null,
  status: 'authenticated' as 'authenticated' | 'loading', update: vi.fn(), close: vi.fn(),
  listener: null as ((event: NotificationStreamPayload) => void) | null, open: vi.fn(),
}));
vi.mock('next-auth/react', () => ({ useSession: () => ({ data: runtime.session, status: runtime.status, update: runtime.update }), signOut: vi.fn() }));
vi.mock('@/services/notification-stream', () => ({ openNotificationStream: (handler: (event: NotificationStreamPayload) => void) => {
  runtime.open(); runtime.listener = handler; return runtime.close;
} }));
vi.mock('@/lib/notification-center', () => ({ initializeNotificationCenter: vi.fn().mockResolvedValue(undefined), upsertNotification: vi.fn() }));
vi.mock('@/services/presence-api', () => ({ presenceApi: { heartbeat: vi.fn().mockResolvedValue(undefined) } }));
vi.mock('@/lib/notification-sound', () => ({ playNotificationBeep: vi.fn() }));

import { NotificationsProvider } from '@/components/providers/NotificationsProvider';
import { SessionRefreshProvider } from '@/features/auth/session-refresh';
import { useAuth } from '@/features/auth/hooks/useAuth';

function Probe() { const { user } = useAuth(); return <output>{user?.role}</output>; }
function Content() { return <SessionRefreshProvider><NotificationsProvider /><Probe /></SessionRefreshProvider>; }

beforeEach(() => {
  vi.clearAllMocks(); vi.useFakeTimers();
  const user: User = { id: 'user-a', name: 'Admin', email: 'admin@local', role: 'ADMIN', tenantId: 'tenant-a',
    churchId: 'tenant-a', version: 1, permissions: [], teamIds: [], accessibleModules: [] };
  useAuthStore.getState().setSession(user, user.tenantId);
  runtime.session = { expires: '2099-01-01', user: { ...user, tenantSlug: 'tenant-a', isPlatformAdmin: false, version: 1 } };
  runtime.status = 'authenticated'; runtime.update.mockResolvedValue(runtime.session);
});
afterEach(() => { cleanup(); vi.useRealTimers(); useAuthStore.getState().logout(); });

describe('SSE e acesso durante retomada', () => {
  it('mantém o stream aberto durante loading e aplica somente versões novas na UI', async () => {
    const view = render(<Content />);
    runtime.status = 'loading'; view.rerender(<Content />);
    expect(runtime.open).toHaveBeenCalledTimes(1);
    expect(runtime.close).not.toHaveBeenCalled();
    act(() => runtime.listener!({ type: 'permissions.updated', tenantId: 'tenant-a', userId: 'user-a', role: 'MEMBER', permissions: [], version: 2 }));
    expect(screen.getByText('MEMBER')).toBeDefined();
    await act(() => vi.advanceTimersByTimeAsync(10));
    expect(runtime.update).toHaveBeenCalledTimes(1);
    expect(screen.getByText('MEMBER')).toBeDefined(); // old response did not restore ADMIN
    act(() => runtime.listener!({ type: 'permissions.updated', role: 'ADMIN', permissions: [], version: 1 }));
    expect(screen.getByText('MEMBER')).toBeDefined();
    act(() => runtime.listener!({ type: 'permissions.updated', role: 'ADMIN', permissions: [], version: 3 }));
    expect(screen.getByText('ADMIN')).toBeDefined();
    expect(runtime.open).toHaveBeenCalledTimes(1);
  });

  it('ignora outro usuário/tenant e reconcilia evento legado sem confiar no perfil do payload', async () => {
    render(<Content />);
    act(() => runtime.listener!({ type: 'permissions.updated', tenantId: 'tenant-b', userId: 'user-b', role: 'MEMBER', permissions: [], version: 9 }));
    await act(() => vi.advanceTimersByTimeAsync(10));
    expect(runtime.update).not.toHaveBeenCalled();
    expect(screen.getByText('ADMIN')).toBeDefined();
    act(() => runtime.listener!({ type: 'permissions.updated', role: 'MEMBER', permissions: [] }));
    await act(() => vi.advanceTimersByTimeAsync(10));
    expect(runtime.update).toHaveBeenCalledTimes(1);
    expect(screen.getByText('ADMIN')).toBeDefined();
  });

  it('não usa acesso de outro ID com o mesmo email e tenant', () => {
    useAuthStore.getState().setSession({ ...useAuthStore.getState().user!, id: 'old-user', role: 'MEMBER', version: 20 }, 'tenant-a');
    render(<Content />);
    expect(screen.getByText('ADMIN')).toBeDefined();
  });
});
