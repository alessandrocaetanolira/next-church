import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCanteenStatus } from '@/features/canteen/hooks/use-canteen-status';
import { useCanteenOperationStore } from '@/features/canteen/store/useCanteenOperationStore';
import { CanteenStatusNotice } from '@/features/canteen/components/CanteenStatusNotice';

const runtime = vi.hoisted(() => ({
  status: vi.fn(), setStatus: vi.fn(),
  user: { id: 'user-a', tenantId: 'tenant-a' } as { id: string; tenantId: string } | null,
}));
vi.mock('@/features/auth/hooks/useAuth', () => ({ useAuth: () => ({ user: runtime.user }) }));
vi.mock('@/features/canteen/api/operations.api', () => ({ canteenOperationsApi: { status: runtime.status, setStatus: runtime.setStatus } }));

const scope = JSON.stringify(['tenant-a', 'user-a']);
const closed = { isOpen: false, openedAt: null };
const open = { isOpen: true, openedAt: '2026-10-15T12:00:00Z' };
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
function Consumer({ name }: { name: string }) {
  const operation = useCanteenStatus();
  return <section aria-label={name}>
    <output>{operation.confirmed ? operation.status.isOpen ? 'Aberta' : 'Fechada' : 'Não confirmado'}</output>
    <button onClick={() => void operation.setOpen(!operation.status.isOpen)}>Alterar operação</button>
    <button disabled={!operation.canCheckout}>Finalizar venda</button>
    <CanteenStatusNotice operation={operation} />
  </section>;
}

beforeEach(() => {
  vi.clearAllMocks();
  runtime.user = { id: 'user-a', tenantId: 'tenant-a' };
  runtime.status.mockResolvedValue(closed);
  runtime.setStatus.mockImplementation(async (isOpen: boolean) => isOpen ? open : closed);
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  useCanteenOperationStore.getState().reset();
});
afterEach(() => { cleanup(); useCanteenOperationStore.getState().reset(); });

describe('status compartilhado da Cantina', () => {
  it('abrir pelo cabeçalho libera PDV/carrinho e checkout sem recarregar', async () => {
    render(<><Consumer name="Cabeçalho" /><Consumer name="Carrinho" /><Consumer name="Checkout" /></>);
    await waitFor(() => expect(screen.getAllByText('Fechada')).toHaveLength(3));
    expect(runtime.status).toHaveBeenCalledTimes(1);
    fireEvent.click(within(screen.getByRole('region', { name: 'Cabeçalho' })).getByText('Alterar operação'));
    await waitFor(() => expect(screen.getAllByText('Aberta')).toHaveLength(3));
    for (const button of screen.getAllByText('Finalizar venda')) expect((button as HTMLButtonElement).disabled).toBe(false);
    expect(runtime.setStatus).toHaveBeenCalledWith(true);

    fireEvent.click(within(screen.getByRole('region', { name: 'Cabeçalho' })).getByText('Alterar operação'));
    await waitFor(() => expect(screen.getAllByText('Fechada')).toHaveLength(3));
    for (const button of screen.getAllByText('Finalizar venda')) expect((button as HTMLButtonElement).disabled).toBe(true);
  });

  it('não sobrescreve uma abertura com resposta atrasada da consulta anterior', async () => {
    const delayed = deferred<typeof closed>();
    runtime.status.mockReturnValueOnce(delayed.promise);
    const read = useCanteenOperationStore.getState().refresh(scope);
    await Promise.resolve();
    await useCanteenOperationStore.getState().setOpen(scope, true);
    delayed.resolve(closed);
    await read;
    expect(useCanteenOperationStore.getState()).toMatchObject({ status: open, loading: false, updating: false, error: null });
  });

  it('falha de rede não é apresentada como fechamento e oferece retry', async () => {
    runtime.status.mockRejectedValueOnce(new Error('Sem rede'));
    render(<Consumer name="Carrinho" />);
    await waitFor(() => expect(screen.getByText(/Não foi possível confirmar o status/)).toBeDefined());
    expect(screen.queryByText('Fechada')).toBeNull();
    expect((screen.getByText('Finalizar venda') as HTMLButtonElement).disabled).toBe(true);
    runtime.status.mockResolvedValue(open);
    fireEvent.click(screen.getByText('Tentar novamente'));
    await waitFor(() => expect((screen.getByText('Finalizar venda') as HTMLButtonElement).disabled).toBe(false));
  });

  it('revalida ao retornar ao app e quando chega aviso SSE de abertura', async () => {
    render(<Consumer name="Carrinho" />);
    await waitFor(() => expect(screen.getByText('Fechada')).toBeDefined());
    runtime.status.mockResolvedValue(open);
    fireEvent(window, new Event('church:canteen-status-updated'));
    await waitFor(() => expect(screen.getByText('Aberta')).toBeDefined());
    runtime.status.mockResolvedValue(closed);
    fireEvent(document, new Event('visibilitychange'));
    await waitFor(() => expect(screen.getByText('Fechada')).toBeDefined());
  });

  it('não reutiliza o status de outro tenant/usuário ou após logout', async () => {
    runtime.status.mockResolvedValue(open);
    const view = render(<Consumer name="Carrinho" />);
    await waitFor(() => expect(screen.getByText('Aberta')).toBeDefined());
    const next = deferred<typeof closed>();
    runtime.status.mockReturnValue(next.promise);
    runtime.user = { id: 'user-b', tenantId: 'tenant-b' };
    view.rerender(<Consumer name="Carrinho" />);
    expect(screen.queryByText('Aberta')).toBeNull();
    expect((screen.getByText('Finalizar venda') as HTMLButtonElement).disabled).toBe(true);
    await act(async () => { next.resolve(closed); });
    await waitFor(() => expect(screen.getByText('Fechada')).toBeDefined());
    runtime.user = null;
    view.rerender(<Consumer name="Carrinho" />);
    expect(useCanteenOperationStore.getState().scopeKey).toBeNull();
    expect(screen.queryByText('Fechada')).toBeNull();
  });

  it('uma resposta de sessão antiga não altera a sessão nova', async () => {
    const delayed = deferred<typeof open>();
    runtime.status.mockReturnValueOnce(delayed.promise).mockResolvedValueOnce(closed);
    const oldRead = useCanteenOperationStore.getState().refresh(scope);
    await Promise.resolve();
    await useCanteenOperationStore.getState().refresh('tenant-b:user-b');
    delayed.resolve(open);
    await oldRead;
    expect(useCanteenOperationStore.getState()).toMatchObject({ scopeKey: 'tenant-b:user-b', status: closed });
  });

  it('uma revalidação durante PATCH aguarda a mutação em vez de sobrescrevê-la', async () => {
    const delayed = deferred<typeof open>();
    runtime.setStatus.mockReturnValueOnce(delayed.promise);
    const write = useCanteenOperationStore.getState().setOpen(scope, true);
    const read = useCanteenOperationStore.getState().refresh(scope);
    await Promise.resolve();
    expect(runtime.status).not.toHaveBeenCalled();
    delayed.resolve(open);
    await Promise.all([write, read]);
    expect(useCanteenOperationStore.getState()).toMatchObject({ status: open, updating: false, loading: false });
  });
});
