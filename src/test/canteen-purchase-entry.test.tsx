import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MyAccountPage from '@/app/minha-conta/page';
import WalletPage from '@/app/carteira/page';
import { MemberDashboard } from '@/features/dashboard/components/MemberDashboard';

const mocks = vi.hoisted(() => ({
  push: vi.fn(), replace: vi.fn(), financials: vi.fn(), query: '',
  user: { id: 'buyer', tenantId: 'church-a', linkedMemberId: 'member-a', role: 'MEMBER', permissions: ['canteen:order'], planFeatures: ['canteen'] },
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push, replace: mocks.replace }), useSearchParams: () => new URLSearchParams(mocks.query) }));
vi.mock('@/components/common', () => ({ LoadingState: ({ label }: { label: string }) => <p role="status">{label}</p> }));
vi.mock('@/features/auth/hooks/useAuth', () => ({ useAuth: () => ({ user: mocks.user, isAuthenticated: true }) }));
vi.mock('@/hooks/use-notification-center', () => ({ useNotificationCenter: () => ({ notifications: [] }) }));
vi.mock('@/hooks/use-push-subscription', () => ({ usePushSubscription: () => ({ supported: true, subscribed: false, loading: false }) }));
vi.mock('dexie-react-hooks', () => ({ useLiveQuery: () => undefined }));
vi.mock('@/features/canteen/lib/sync-member-sales', () => ({ syncMemberSalesFromServer: mocks.financials }));
vi.mock('@/lib/loyalty', () => ({ getLoyaltyConfig: () => ({}), getLoyaltyProgress: () => null, isLoyaltyActive: () => false }));
vi.mock('@/services/engagement/engagement-api', () => ({ getEngagementProfile: async () => ({ points: 0 }), updateEngagementProfile: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks(); mocks.query = ''; mocks.user.permissions = ['canteen:order'];
  mocks.financials.mockResolvedValue({ member: { id: 'member-a', name: 'Ana', creditBalance: 12 }, sales: [], summary: { debits: 12, payments: 0, balance: 12 }, ledger: [{ id: 'ledger-a', type: 'debit', amount: 12, createdAt: '2026-10-16T12:00:00Z' }] });
});
afterEach(cleanup);

describe('entrada unificada de compra', () => {
  it('Carteira mantém saldo, extrato e alertas e leva comprador order-only à Cantina', async () => {
    render(<MyAccountPage />);
    await waitFor(() => expect(screen.getByText('Saldo em Aberto')).toBeDefined());
    expect(screen.getByText('Extrato de débitos e pagamentos')).toBeDefined();
    expect(screen.getByText('Alertas')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Fazer Pedido' }));
    expect(mocks.push).toHaveBeenCalledWith('/cantina');
    expect(screen.queryByText('Confirmar Pedido (Fiado)')).toBeNull();
    expect(screen.queryByText('Cardápio')).toBeNull();
  });

  it.each([['minha conta', MyAccountPage], ['carteira', WalletPage]] as const)('redireciona link legado de %s sem montar UI/consulta antiga', async (_name, Page) => {
    mocks.query = 'view=order';
    render(<Page />);
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/cantina'));
    expect(mocks.financials).not.toHaveBeenCalled();
    expect(screen.queryByText('Cardápio')).toBeNull();
  });

  it('não exibe o atalho sem permissão de comprar', () => {
    mocks.user.permissions = [];
    render(<MyAccountPage />);
    expect(screen.queryByRole('button', { name: 'Fazer Pedido' })).toBeNull();
  });

  it('Dashboard abre exatamente a mesma compra pessoal, sem carrinho paralelo', async () => {
    render(<MemberDashboard />);
    fireEvent.click(screen.getByRole('button', { name: /Fazer Pedido/i }));
    expect(mocks.push).toHaveBeenCalledWith('/cantina');
    await waitFor(() => expect(screen.getByText('0')).toBeDefined());
    expect(screen.queryByText('Cardápio')).toBeNull();
  });
});
