import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEffect, type ReactNode } from 'react';
import type { Session } from 'next-auth';
import { useAuthStore, type User } from '@/features/auth/store';
import { getAccessibleModules } from '@/lib/access-control';
import { getRoleDefaultPermissions } from '@/lib/permission-catalog';

const runtime = vi.hoisted(() => ({
  session: null as Session | null,
  status: 'loading' as 'loading' | 'authenticated' | 'unauthenticated',
  update: vi.fn(), shellMount: vi.fn(), shellUnmount: vi.fn(), drawerMount: vi.fn(),
}));
vi.mock('next-auth/react', () => ({ useSession: () => ({ data: runtime.session, status: runtime.status, update: runtime.update }), signOut: vi.fn() }));
vi.mock('next/navigation', () => ({ usePathname: () => '/feed' }));
vi.mock('@/components/NavLink', () => ({ NavLink: ({ to, children, ...props }: { to: string; children: ReactNode }) => <a href={to} {...props}>{children}</a> }));
vi.mock('@/components/layout/AppLayout', () => ({ AppLayout: ({ children }: { children: ReactNode }) => {
  useEffect(() => { runtime.shellMount(); return () => { runtime.shellUnmount(); }; }, []);
  return <div data-testid="shell">{children}</div>;
} }));
vi.mock('@/components/providers/NotificationsProvider', () => ({ NotificationsProvider: () => null }));
vi.mock('@/components/ui/sonner', () => ({ Toaster: () => null }));
vi.mock('@/components/common', () => ({ LoadingState: () => <p>Carregando aplicação</p> }));
vi.mock('@/components/ui/drawer', () => ({
  Drawer: ({ open, children, repositionInputs }: { open: boolean; children: ReactNode; repositionInputs: boolean }) => {
    useEffect(() => { runtime.drawerMount(); }, []);
    return <div data-testid="drawer" data-keyboard={String(repositionInputs)}>{open ? children : null}</div>;
  },
  DrawerContent: ({ children, className }: { children: ReactNode; className?: string }) => <section data-testid="drawer-content" className={className}>{children}</section>,
  DrawerTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

import { LayoutWrapper } from '@/components/layout/LayoutWrapper';
import { DrawerProvider, useDrawer } from '@/components/providers/DrawerProvider';
import { MobileMenuDrawer } from '@/components/layout/MobileMenuDrawer';
import { createSessionRevalidator, SessionRefreshProvider } from '@/features/auth/session-refresh';

function user(role: User['role'] = 'ADMIN', version = 1): User {
  const result: User = { id: 'user-a', name: 'Teste', email: 'test@local', churchId: 'tenant-a', tenantId: 'tenant-a',
    role, version, permissions: [], teamIds: [], accessibleModules: [] };
  result.accessibleModules = [...getAccessibleModules(result)];
  return result;
}
function authenticate(role: User['role'] = 'ADMIN', version = 1) {
  const current = user(role, version);
  runtime.session = { expires: '2099-01-01', user: { ...current, tenantSlug: 'tenant-a', isPlatformAdmin: false, version } };
  runtime.status = 'authenticated';
  useAuthStore.getState().setSession(current, current.tenantId);
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
function OpenDrawer() {
  const { openDrawer } = useDrawer();
  return <>
    <button onClick={() => openDrawer({ content: <MobileMenuDrawer />, closeOnSuspend: true, repositionInputs: false })}>Abrir menu</button>
    <button onClick={() => openDrawer({ content: <input aria-label="Anotação" defaultValue="Meu texto" /> })}>Abrir formulário</button>
  </>;
}

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  useAuthStore.getState().logout();
  authenticate();
});
afterEach(() => { cleanup(); vi.useRealTimers(); useAuthStore.getState().logout(); });

describe('shell durante revalidação', () => {
  it('mantém a mesma instância, conteúdo e scroll durante loading de sessão existente', async () => {
    vi.useFakeTimers();
    const content = <SessionRefreshProvider><LayoutWrapper><input aria-label="Busca" /></LayoutWrapper></SessionRefreshProvider>;
    const view = render(content);
    const shell = screen.getByTestId('shell');
    shell.scrollTop = 180;
    fireEvent.change(screen.getByLabelText('Busca'), { target: { value: 'texto preservado' } });
    runtime.status = 'loading';
    view.rerender(<SessionRefreshProvider><LayoutWrapper><input aria-label="Busca" /></LayoutWrapper></SessionRefreshProvider>);
    await act(() => vi.advanceTimersByTimeAsync(3000));
    expect(screen.getByTestId('shell')).toBe(shell);
    expect(shell.scrollTop).toBe(180);
    expect((screen.getByLabelText('Busca') as HTMLInputElement).value).toBe('texto preservado');
    expect(runtime.shellMount).toHaveBeenCalledTimes(1);
    expect(runtime.shellUnmount).not.toHaveBeenCalled();
  });

  it('usa loading inicial sem sessão e retira o shell quando a revogação é confirmada', () => {
    runtime.session = null; runtime.status = 'loading';
    const view = render(<LayoutWrapper><p>Página</p></LayoutWrapper>);
    expect(screen.queryByTestId('shell')).toBeNull();
    expect(screen.getByText('Carregando aplicação')).toBeDefined();
    authenticate();
    view.rerender(<LayoutWrapper><p>Página</p></LayoutWrapper>);
    expect(screen.getByTestId('shell')).toBeDefined();
    runtime.session = { ...runtime.session!, user: { ...runtime.session!.user, authValid: false } };
    view.rerender(<LayoutWrapper><p>Página</p></LayoutWrapper>);
    expect(screen.queryByTestId('shell')).toBeNull();
  });
});

describe('acesso e menu já aberto', () => {
  it('reage ADMIN → MEMBER → ADMIN mesmo com a sessão anterior em memória', () => {
    render(<DrawerProvider><OpenDrawer /></DrawerProvider>);
    fireEvent.click(screen.getByText('Abrir menu'));
    expect(screen.getByText('Membros')).toBeDefined();
    act(() => useAuthStore.getState().updateAccess({ role: 'MEMBER', permissions: getRoleDefaultPermissions('MEMBER'), version: 2 }, { id: 'user-a', tenantId: 'tenant-a' }));
    expect(screen.queryByText('Membros')).toBeNull();
    expect(screen.queryByText('Materiais')).toBeNull();
    expect(screen.getByText('Jogos')).toBeDefined();
    act(() => useAuthStore.getState().updateAccess({ role: 'ADMIN', version: 3 }, { id: 'user-a', tenantId: 'tenant-a' }));
    expect(screen.getByText('Membros')).toBeDefined();
    expect(screen.getByText('Configurações')).toBeDefined();
  });

  it('rejeita respostas antigas, campos undefined e atualizações de outra identidade', () => {
    const store = useAuthStore.getState();
    store.updateAccess({ role: 'MEMBER', permissions: ['feed:view'], version: 4 });
    store.setSession(user('ADMIN', 3), 'tenant-a');
    expect(useAuthStore.getState().user?.role).toBe('MEMBER');
    store.updateAccess({ role: undefined, permissions: undefined, version: 5 });
    expect(useAuthStore.getState().user?.permissions).toEqual(['feed:view']);
    expect(useAuthStore.getState().user?.role).toBe('MEMBER');
    store.updateAccess({ role: 'ADMIN', version: 6 }, { id: 'user-b', tenantId: 'tenant-b' });
    expect(useAuthStore.getState().user?.role).toBe('MEMBER');
    store.updateAccess({ role: 'ADMIN' });
    expect(useAuthStore.getState().user?.role).toBe('MEMBER');
    store.setSession(user('ADMIN', 6), 'tenant-a');
    expect(useAuthStore.getState().user?.role).toBe('ADMIN');
  });

  it('fecha somente o menu na suspensão e isola cada abertura de drawer', () => {
    render(<DrawerProvider><OpenDrawer /></DrawerProvider>);
    fireEvent.click(screen.getByText('Abrir menu'));
    expect(screen.getByTestId('drawer').getAttribute('data-keyboard')).toBe('false');
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    fireEvent(document, new Event('visibilitychange'));
    expect(screen.queryByText('Mais opções')).toBeNull();
    fireEvent.click(screen.getByText('Abrir formulário'));
    expect(screen.getByTestId('drawer').getAttribute('data-keyboard')).toBe('true');
    fireEvent(window, new Event('pagehide'));
    expect((screen.getByLabelText('Anotação') as HTMLInputElement).value).toBe('Meu texto');
    expect(runtime.drawerMount).toHaveBeenCalledTimes(3); // closed root, menu, form
  });
});

describe('coordenação de revalidação', () => {
  it('coalesce eventos de retorno e faz nova leitura quando chega SSE durante a consulta', async () => {
    vi.useFakeTimers();
    const first = deferred<number>();
    const load = vi.fn().mockReturnValueOnce(first.promise).mockResolvedValueOnce(2);
    const refresh = createSessionRevalidator(() => 'tenant-a/user-a', load);
    const pending = refresh();
    expect(refresh()).toBe(pending);
    await vi.advanceTimersByTimeAsync(1);
    expect(load).toHaveBeenCalledTimes(1);
    expect(refresh({ afterCurrent: true })).toBe(pending);
    first.resolve(1);
    await vi.advanceTimersByTimeAsync(2);
    await expect(pending).resolves.toBe(2);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('descarta resultado após troca de identidade e permite nova consulta após falha', async () => {
    vi.useFakeTimers();
    let identity = 'tenant-a/user-a';
    const first = deferred<number>();
    const load = vi.fn().mockReturnValueOnce(first.promise).mockRejectedValueOnce(new Error('rede')).mockResolvedValueOnce(3);
    const refresh = createSessionRevalidator(() => identity, load);
    const pending = refresh();
    await vi.advanceTimersByTimeAsync(1);
    identity = 'tenant-b/user-b'; first.resolve(1);
    await expect(pending).resolves.toBeUndefined();
    const failed = refresh();
    const failureCheck = expect(failed).rejects.toThrow('rede');
    await vi.advanceTimersByTimeAsync(1); await failureCheck;
    const retry = refresh(); await vi.advanceTimersByTimeAsync(1);
    await expect(retry).resolves.toBe(3);
  });
});
