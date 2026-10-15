import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CanteenCheckout } from '@/features/canteen/components/CanteenCheckout';
import { useCanteenOperationStore } from '@/features/canteen/store/useCanteenOperationStore';
import { useCartStore } from '@/features/canteen/store/useCartStore';
import { db } from '@/lib/db';

const runtime = vi.hoisted(() => ({ status: vi.fn(), setStatus: vi.fn(), createSale: vi.fn(), replace: vi.fn(), push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: runtime.replace, push: runtime.push }) }));
vi.mock('@/features/auth/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'user-a', tenantId: 'tenant-a', email: 'operator@test.local' } }) }));
vi.mock('@/features/canteen/hooks/use-canteen-cart-owner', () => ({ useCanteenCartOwner: () => true }));
vi.mock('@/features/canteen/api/operations.api', () => ({ canteenOperationsApi: { status: runtime.status, setStatus: runtime.setStatus } }));
vi.mock('@/services/canteen/sales-api', () => ({ createCanteenSale: runtime.createSale }));
const scope = JSON.stringify(['tenant-a', 'user-a']);
const open = { isOpen: true, openedAt: '2026-10-15T12:00:00Z' };
const closed = { isOpen: false, openedAt: null };

beforeEach(async () => {
  vi.clearAllMocks();
  runtime.status.mockResolvedValue(open);
  runtime.setStatus.mockImplementation(async (isOpen: boolean) => isOpen ? open : closed);
  runtime.createSale.mockResolvedValue({ id: 'sale-a' });
  useCanteenOperationStore.getState().reset();
  useCartStore.setState({ items: [], carts: {}, activeOwnerKey: null, isReady: false, total: 0 });
  useCartStore.getState().selectOwner({ tenantId: 'tenant-a', userId: 'user-a' });
  useCartStore.getState().addItem({ productId: 'product-a', name: 'Água', price: 5, quantity: 1 });
  await db.sales.clear();
});
afterEach(() => { cleanup(); useCanteenOperationStore.getState().reset(); });

describe('checkout com status operacional compartilhado', () => {
  it('libera o checkout já aberto quando a operação muda para aberta', async () => {
    runtime.status.mockResolvedValue(closed);
    render(<CanteenCheckout />);
    await waitFor(() => expect((screen.getByRole('button', { name: 'Cantina fechada' }) as HTMLButtonElement).disabled).toBe(true));
    await act(async () => { await useCanteenOperationStore.getState().setOpen(scope, true); });
    expect((screen.getByRole('button', { name: 'Confirmar venda' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('revalida antes do POST e preserva a sacola se a cantina tiver sido fechada', async () => {
    render(<CanteenCheckout />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirmar venda' })).toBeDefined());
    runtime.status.mockResolvedValue(closed);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar venda' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cantina fechada' })).toBeDefined());
    expect(runtime.createSale).not.toHaveBeenCalled();
    expect(useCartStore.getState().items).toHaveLength(1);
  });

  it('não envia a venda nem informa fechamento quando a consulta falha', async () => {
    render(<CanteenCheckout />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirmar venda' })).toBeDefined());
    runtime.status.mockRejectedValue(new Error('Sem conexão'));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar venda' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Status indisponível' })).toBeDefined());
    expect(screen.queryByRole('button', { name: 'Cantina fechada' })).toBeNull();
    expect(runtime.createSale).not.toHaveBeenCalled();
    expect(useCartStore.getState().items).toHaveLength(1);
  });

  it('confirma a operação no servidor e só limpa o carrinho após registrar a venda', async () => {
    render(<CanteenCheckout />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirmar venda' })).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar venda' }));
    await waitFor(() => expect(runtime.replace).toHaveBeenCalledWith('/cantina?tab=sales'));
    expect(runtime.status).toHaveBeenCalledTimes(2);
    expect(runtime.createSale).toHaveBeenCalledOnce();
    expect(useCartStore.getState().items).toEqual([]);
    expect((await db.sales.toArray())[0]._status).toBe('synced');
  });
});
