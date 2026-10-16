import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMyCanteenOrders } from '@/features/canteen/hooks/use-my-canteen-orders';

const mocks = vi.hoisted(() => ({
  user: { id: 'buyer-a', tenantId: 'tenant-a', linkedMemberId: 'member-a' },
  notifications: [] as { id: string; type: string }[], sync: vi.fn(),
}));
vi.mock('@/features/auth/hooks/useAuth', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('@/hooks/use-notification-center', () => ({ useNotificationCenter: () => ({ notifications: mocks.notifications }) }));
vi.mock('@/features/canteen/lib/sync-member-sales', () => ({ syncMemberSalesFromServer: mocks.sync }));

beforeEach(() => {
  vi.clearAllMocks(); mocks.user = { id: 'buyer-a', tenantId: 'tenant-a', linkedMemberId: 'member-a' }; mocks.notifications = [];
  mocks.sync.mockResolvedValue({ sales: [{ id: 'own', memberId: 'member-a' }, { id: 'other', memberId: 'member-b' }] });
});
afterEach(cleanup);

describe('consulta de pedidos próprios', () => {
  it('usa a consulta pessoal do tenant e filtra pelo vínculo atual', async () => {
    const { result } = renderHook(useMyCanteenOrders);
    await waitFor(() => expect(result.current.current?.sales).toEqual([{ id: 'own', memberId: 'member-a' }]));
    expect(mocks.sync).toHaveBeenCalledWith('tenant-a');
  });

  it('atualiza por notificação de pedido e retorno da conexão sem abrir outro stream', async () => {
    const { rerender } = renderHook(useMyCanteenOrders);
    await waitFor(() => expect(mocks.sync).toHaveBeenCalledTimes(1));
    mocks.notifications = [{ id: 'ready-a', type: 'canteen-order-ready' }]; rerender();
    await waitFor(() => expect(mocks.sync).toHaveBeenCalledTimes(2));
    act(() => window.dispatchEvent(new Event('online')));
    await waitFor(() => expect(mocks.sync).toHaveBeenCalledTimes(3));
  });

  it('não apresenta pedidos da identidade anterior durante a troca de usuário/tenant', async () => {
    const { result, rerender } = renderHook(useMyCanteenOrders);
    await waitFor(() => expect(result.current.current?.sales).toHaveLength(1));
    mocks.sync.mockImplementationOnce(() => new Promise(() => {}));
    mocks.user = { id: 'buyer-b', tenantId: 'tenant-b', linkedMemberId: 'member-b' }; rerender();
    expect(result.current.current).toBeUndefined();
    expect(mocks.sync).toHaveBeenLastCalledWith('tenant-b');
  });

  it('mostra erro e permite tentar novamente, sem simular histórico vazio em falha', async () => {
    mocks.sync.mockRejectedValueOnce(new Error('offline'));
    const { result } = renderHook(useMyCanteenOrders);
    await waitFor(() => expect(result.current.current?.error).toBe(true));
    act(() => result.current.refresh());
    await waitFor(() => expect(result.current.current?.error).toBe(false));
  });
});
