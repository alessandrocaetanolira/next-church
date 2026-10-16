import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CanteenContainer } from '@/features/canteen/components/CanteenContainer';
import { getRoleDefaultPermissions } from '@/lib/permission-catalog';

const state = vi.hoisted(() => ({
  user: { id: 'user-a', tenantId: 'tenant-a', role: 'MEMBER', permissions: [] as string[], planFeatures: ['canteen'] },
  query: '', replace: vi.fn(), syncSales: vi.fn(), syncMembers: vi.fn(), notifications: [],
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/cantina', useSearchParams: () => new URLSearchParams(state.query), useRouter: () => ({ replace: state.replace }) }));
vi.mock('@/features/auth/hooks/useAuth', () => ({ useAuth: () => ({ user: state.user }) }));
vi.mock('@/hooks/use-notification-center', () => ({ useNotificationCenter: () => ({ notifications: state.notifications }) }));
vi.mock('@/features/canteen/hooks/use-canteen-status', () => ({ useCanteenStatus: () => ({ status: { isOpen: true }, loading: false, updating: false, confirmed: true, error: null, refresh: vi.fn(), setOpen: vi.fn() }) }));
vi.mock('@/features/canteen/lib/sync-sales', () => ({ syncCanteenSalesFromServer: state.syncSales }));
vi.mock('@/features/canteen/lib/sync-members', () => ({ syncCanteenMembersFromServer: state.syncMembers }));
vi.mock('@/features/canteen/components/CanteenCartView', () => ({ CanteenCartView: () => <p>Carrinho compartilhado</p> }));
vi.mock('@/features/canteen/components/CatalogView', () => ({ CatalogView: () => <p>Catálogo somente leitura</p> }));
vi.mock('@/features/canteen/components/MemberOrdersView', () => ({ MemberOrdersView: () => <p>Fila operacional</p> }));
vi.mock('@/features/canteen/components/PreparoView', () => ({ PreparoView: () => <p>Preparo operacional</p> }));
vi.mock('@/features/canteen/components/SalesHistory', () => ({ SalesHistory: () => <p>Histórico de terceiros</p> }));
vi.mock('@/features/canteen/components/ProductsManager', () => ({ ProductsManager: () => <p>Gestão de produtos</p> }));
vi.mock('@/features/settings/components/LoyaltySettings', () => ({ LoyaltySettings: () => <p>Gestão de fidelidade</p> }));

beforeEach(() => {
  vi.clearAllMocks();
  state.user.role = 'MEMBER'; state.user.permissions = getRoleDefaultPermissions('MEMBER'); state.query = '';
  state.syncSales.mockResolvedValue([]); state.syncMembers.mockResolvedValue([]);
});
afterEach(cleanup);

describe('menu operacional versus carrinho do comprador', () => {
  it.each(['', 'tab=buy', 'tab=pdv', 'tab=cart'])('admin abre um único carrinho e banner pela entrada %s', (query) => {
    state.user.role = 'ADMIN'; state.query = query;
    const { container } = render(<CanteenContainer />);
    expect(screen.getAllByText('Carrinho compartilhado')).toHaveLength(1);
    expect(screen.getAllByText('Cantina aberta')).toHaveLength(1);
    expect(container.firstElementChild?.firstElementChild?.getAttribute('role')).toBe('status');
    expect(screen.getByRole('tab', { name: 'Carrinho' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.queryByRole('tab', { name: 'Comprar' })).toBeNull();
    expect(screen.queryByRole('tab', { name: 'PDV' })).toBeNull();
  });

  it('voltar da operação ao carrinho usa a entrada única /cantina', () => {
    state.user.role = 'ADMIN'; state.query = 'tab=products';
    render(<CanteenContainer />);
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Carrinho' }), { button: 0, ctrlKey: false });
    expect(state.replace).toHaveBeenCalledWith('/cantina', { scroll: false });
  });

  it('comprador não recebe menu horizontal nem consulta dados operacionais no retorno ao app', () => {
    state.query = 'tab=sales';
    render(<CanteenContainer />);
    expect(screen.getByText('Carrinho compartilhado')).toBeDefined();
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.queryByText('Histórico de terceiros')).toBeNull();
    expect(screen.queryByRole('button', { name: /Fechar cantina/ })).toBeNull();
    fireEvent(window, new Event('online'));
    expect(state.syncSales).not.toHaveBeenCalled();
    expect(state.syncMembers).not.toHaveBeenCalled();
  });

  it('catálogo básico sem order não cai na aba Vendas', () => {
    state.user.permissions = ['canteen:view'];
    render(<CanteenContainer />);
    expect(screen.getByText('Catálogo somente leitura')).toBeDefined();
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.queryByText('Histórico de terceiros')).toBeNull();
  });

  it('operador tem uma única aba de carrinho, sem Comprar ou PDV duplicados', () => {
    state.user.role = 'CANTEEN'; state.user.permissions = getRoleDefaultPermissions('CANTEEN');
    render(<CanteenContainer />);
    expect(screen.getByRole('tablist')).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Comprar para mim' })).toBeNull();
    expect(screen.getByRole('tab', { name: 'Carrinho' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.queryByRole('tab', { name: 'Comprar' })).toBeNull();
    expect(screen.queryByRole('tab', { name: 'PDV' })).toBeNull();
    expect(screen.getByText('Cantina aberta')).toBeDefined();
  });

  it('admin mantém abas autorizadas inclusive ao comprar sem alternador de modo', () => {
    state.user.role = 'ADMIN'; state.query = 'tab=buy';
    render(<CanteenContainer />);
    expect(screen.getByText('Carrinho compartilhado')).toBeDefined();
    expect(screen.getByRole('tablist')).toBeDefined();
    expect(screen.getByRole('tab', { name: 'Carrinho' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.queryByRole('button', { name: 'Voltar à operação' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Fechar cantina' })).toBeDefined();
  });

  it('revogação recebida por SSE elimina imediatamente abas antigas sem logout', () => {
    state.user.role = 'ADMIN'; state.query = 'tab=pdv';
    const view = render(<CanteenContainer />);
    expect(screen.getByRole('tablist')).toBeDefined();
    state.user.role = 'MEMBER'; state.user.permissions = getRoleDefaultPermissions('MEMBER');
    view.rerender(<CanteenContainer />);
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.queryByRole('tab', { name: 'Pedidos' })).toBeNull();
    expect(screen.getByText('Carrinho compartilhado')).toBeDefined();
  });
});
