import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CanteenContainer } from '@/features/canteen/components/CanteenContainer';
import { useCartStore } from '@/features/canteen/store/useCartStore';
import { useCanteenOperationStore } from '@/features/canteen/store/useCanteenOperationStore';
import { db } from '@/lib/db';
import { ApiRequestError } from '@/lib/api';

const mocks = vi.hoisted(() => ({
  status: vi.fn(), create: vi.fn(), error: vi.fn(), success: vi.fn(), push: vi.fn(),
  user: { id: 'buyer-a', name: 'Ana', email: 'ana@test.local', tenantId: 'tenant-a', role: 'MEMBER', linkedMemberId: 'member-a' as string | null, permissions: ['canteen:order'], planFeatures: ['canteen'] },
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/cantina', useSearchParams: () => new URLSearchParams(), useRouter: () => ({ push: mocks.push, replace: vi.fn() }) }));
vi.mock('@/hooks/use-notification-center', () => ({ useNotificationCenter: () => ({ notifications: [] }) }));
vi.mock('@/features/auth/hooks/useAuth', () => ({ useAuth: () => ({ user: mocks.user, isLoading: false }) }));
vi.mock('@/features/canteen/hooks/use-products', () => ({ useProducts: () => [{ id: 'water', tenantId: 'tenant-a', name: 'Água', category: 'Bebidas', stock: 5, price: 5, active: true, availableToday: true }] }));
vi.mock('@/features/canteen/api/operations.api', () => ({ canteenOperationsApi: { status: mocks.status } }));
vi.mock('@/features/canteen/api/sales.api', () => ({ salesApi: { create: mocks.create } }));
vi.mock('@/components/providers/DrawerProvider', () => ({ useDrawer: () => ({ openDrawer: vi.fn() }) }));
vi.mock('sonner', () => ({ toast: { error: mocks.error, success: mocks.success } }));

const open = { isOpen: true, openedAt: '2026-10-16T12:00:00Z' };
const closed = { isOpen: false, openedAt: null };

beforeEach(async () => {
  vi.clearAllMocks();
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  mocks.user.role = 'MEMBER'; mocks.user.permissions = ['canteen:order'];
  mocks.user.linkedMemberId = 'member-a';
  mocks.status.mockResolvedValue(open);
  mocks.create.mockResolvedValue({ id: 'sale-a' });
  useCanteenOperationStore.getState().reset();
  useCartStore.setState({ items: [], carts: {}, activeOwnerKey: null, isReady: false, total: 0 });
  await db.sales.clear(); await db.members.clear(); await db.syncOutbox.clear();
});
afterEach(() => { cleanup(); useCanteenOperationStore.getState().reset(); vi.unstubAllGlobals(); });

function addWater() { fireEvent.click(screen.getByRole('button', { name: 'Adicionar Água à sacola' })); }
function sendButton() { return screen.getByRole('button', { name: 'Enviar pedido' }) as HTMLButtonElement; }

describe('pedido pessoal de membro sem permissão de operação', () => {
  it('não apaga alterações feitas no carrinho enquanto o pedido está sendo enviado', async () => {
    let resolve!: (value: unknown) => void;
    mocks.create.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    render(<CanteenContainer />);
    await waitFor(() => expect((screen.getByRole('button', { name: 'Adicionar Água à sacola' }) as HTMLButtonElement).disabled).toBe(false));
    addWater(); fireEvent.click(sendButton());
    await waitFor(() => expect(mocks.create).toHaveBeenCalledOnce());
    act(() => useCartStore.getState().addItem({ productId: 'water', name: 'Água', price: 5, quantity: 1 }));
    await act(async () => resolve({ id: 'sale-a' }));
    await waitFor(() => expect(mocks.success).toHaveBeenCalled());
    expect(useCartStore.getState().items[0].quantity).toBe(2);
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });

  it('não oferece finalização de venda a comprador mesmo entrando diretamente pela NavBottom', async () => {
    render(<CanteenContainer />);
    await waitFor(() => expect(screen.getByText('Cantina aberta')).toBeDefined());
    expect(screen.queryByRole('button', { name: 'Finalizar venda' })).toBeNull();
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.getByRole('button', { name: 'Enviar pedido' })).toBeDefined();
  });

  it('operador usa os mesmos produtos e carrinho para escolher pedido próprio ou checkout de venda', async () => {
    mocks.user.permissions = ['canteen:order', 'canteen:sell'];
    render(<CanteenContainer />);
    await waitFor(() => expect((screen.getByRole('button', { name: 'Adicionar Água à sacola' }) as HTMLButtonElement).disabled).toBe(false));
    addWater();
    const sell = screen.getByRole('button', { name: 'Finalizar venda' }) as HTMLButtonElement;
    await waitFor(() => expect(sell.disabled).toBe(false));
    fireEvent.click(sell);
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/cantina/checkout'));
    expect(mocks.create).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Enviar pedido para mim' }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ intent: 'purchase', memberId: 'member-a', paymentMethod: 'pending', total: 5 })));
  });

  it('permissão de venda isolada não concede pedido pessoal como efeito colateral', async () => {
    mocks.user.permissions = ['canteen:sell'];
    render(<CanteenContainer />);
    await waitFor(() => expect(screen.getByText('Cantina aberta')).toBeDefined());
    expect(screen.getByRole('button', { name: 'Finalizar venda' })).toBeDefined();
    expect(screen.queryByRole('button', { name: /Enviar pedido/ })).toBeNull();
  });

  it('mostra o banner no topo da compra sem botões de abertura ou atualização manual', async () => {
    const { container } = render(<CanteenContainer />);
    await waitFor(() => expect(screen.getByText('Cantina aberta')).toBeDefined());
    expect(container.firstElementChild?.firstElementChild?.getAttribute('role')).toBe('status');
    expect(screen.queryByRole('button', { name: /Abrir cantina|Fechar cantina|Atualizar status|Comprar para mim/ })).toBeNull();
  });

  it('compra com vínculo de sessão sem depender de membro já carregado no Dexie', async () => {
    render(<CanteenContainer />);
    await waitFor(() => expect((screen.getByRole('button', { name: 'Adicionar Água à sacola' }) as HTMLButtonElement).disabled).toBe(false));
    addWater();
    await waitFor(() => expect(sendButton().disabled).toBe(false));
    fireEvent.click(sendButton());
    await waitFor(() => expect(mocks.create).toHaveBeenCalledOnce());
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ intent: 'purchase', memberId: 'member-a', paymentMethod: 'pending', orderStatus: 'pending', total: 5 }));
    await waitFor(() => expect(useCartStore.getState().items).toEqual([]));
    expect(await db.members.count()).toBe(0);
    expect(mocks.status).toHaveBeenCalledTimes(2);
  });

  it('fechada permite montar carrinho, mas bloqueia enviar até abrir sem perder os itens', async () => {
    mocks.status.mockResolvedValue(closed);
    render(<CanteenContainer />);
    await waitFor(() => expect(screen.getByText(/Você pode ajustar o carrinho/)).toBeDefined());
    addWater();
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(sendButton().disabled).toBe(true);
    expect(mocks.create).not.toHaveBeenCalled();
    mocks.status.mockResolvedValue(open);
    await act(async () => { await useCanteenOperationStore.getState().refresh(JSON.stringify(['tenant-a', 'buyer-a'])); });
    expect(sendButton().disabled).toBe(false);
    expect(useCartStore.getState().items).toHaveLength(1);
  });

  it('revalida abertura antes de POST e preserva carrinho se fechar entre as telas', async () => {
    render(<CanteenContainer />);
    await waitFor(() => expect(useCanteenOperationStore.getState().status?.isOpen).toBe(true));
    addWater();
    mocks.status.mockResolvedValue(closed);
    fireEvent.click(sendButton());
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith(expect.stringContaining('fechada')));
    expect(mocks.create).not.toHaveBeenCalled();
    expect(useCartStore.getState().items).toHaveLength(1);
  });

  it('falha de status não significa aberta e não impede montar o rascunho', async () => {
    mocks.status.mockRejectedValue(new Error('Sem conexão'));
    render(<CanteenContainer />);
    await waitFor(() => expect(screen.getByText('Status indisponível')).toBeDefined());
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).toBeNull();
    addWater();
    expect(sendButton().disabled).toBe(true);
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('erro no envio não limpa carrinho nem anuncia pedido confirmado', async () => {
    mocks.create.mockRejectedValue(new ApiRequestError('Produto indisponível.', 409));
    render(<CanteenContainer />);
    await waitFor(() => expect(useCanteenOperationStore.getState().status?.isOpen).toBe(true));
    addWater(); fireEvent.click(sendButton());
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Produto indisponível.'));
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(mocks.success).not.toHaveBeenCalled();
    expect(await db.syncOutbox.count()).toBe(0);
  });

  it('falha de rede não anuncia sucesso nem enfileira silenciosamente uma compra', async () => {
    mocks.create.mockRejectedValue(new TypeError('Failed to fetch'));
    render(<CanteenContainer />);
    await waitFor(() => expect(useCanteenOperationStore.getState().status?.isOpen).toBe(true));
    addWater(); fireEvent.click(sendButton());
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith(expect.stringContaining('Sem confirmação de envio')));
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(mocks.success).not.toHaveBeenCalled();
    expect(await db.syncOutbox.count()).toBe(0);
  });

  it('sem vínculo permite montar rascunho e explica por que não pode enviar', async () => {
    mocks.user.linkedMemberId = null;
    render(<CanteenContainer />);
    await waitFor(() => expect(screen.getByText(/Solicite a regularização/)).toBeDefined());
    addWater();
    expect(sendButton().disabled).toBe(true);
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
