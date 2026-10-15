import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { db, type LocalProduct } from '@/lib/db';
import { useCartStore } from '@/features/canteen/store/useCartStore';
import { ProductCard } from '@/features/canteen/components/ProductCard';
import { ProductPurchaseActions } from '@/features/canteen/components/ProductPurchaseActions';
import { ProductDetailsDrawer } from '@/features/canteen/components/ProductDetailsDrawer';
import { ProductManagementCard } from '@/features/canteen/components/ProductManagementCard';

vi.mock('@/features/auth/hooks/useAuth', () => ({ useAuth: () => ({ user: { tenantId: 'tenant-a' } }) }));
vi.mock('@/features/canteen/hooks/use-canteen-cart-owner', () => ({ useCanteenCartOwner: () => true }));
vi.mock('@/components/providers/DrawerProvider', () => ({ useDrawer: () => ({ closeDrawer: vi.fn() }) }));
vi.mock('@/components/ui/drawer', () => ({
  DrawerHeader: ({ children }: { children: ReactNode }) => <header>{children}</header>,
  DrawerTitle: ({ children, ...props }: { children: ReactNode }) => <h2 {...props}>{children}</h2>,
  DrawerDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
}));

const product: LocalProduct = {
  id: 'product-a', tenantId: 'tenant-a', name: 'Sanduíche natural', category: 'Lanches',
  description: 'Pão integral com frango, cenoura e alface.\nPreparado no dia.',
  price: 12.5, cost: 5, stock: 2, minStock: 1, active: true, availableToday: true,
  imageUrl: null, createdAt: '2026-10-15T12:00:00Z', updatedAt: '2026-10-15T12:00:00Z', deletedAt: null,
};

beforeEach(async () => {
  await db.products.clear();
  window.localStorage.clear();
  useCartStore.setState({ items: [], carts: {}, activeOwnerKey: null, isReady: false, total: 0 });
  useCartStore.getState().selectOwner({ tenantId: 'tenant-a', userId: 'user-a' });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('card de produto da Cantina', () => {
  it('mostra Recomendado apenas quando o servidor indicou um destaque válido', () => {
    const view = render(<ProductCard product={{ ...product, recommended: true, recommendationCalculatedAt: new Date().toISOString() }} onViewDetails={vi.fn()} />);
    expect(screen.getByText('Recomendado')).toBeDefined();
    view.rerender(<ProductCard product={product} onViewDetails={vi.fn()} />);
    expect(screen.queryByText('Recomendado')).toBeNull();
  });
  it('mostra descrição mesmo sem foto e separa a consulta da adição à sacola', () => {
    const onViewDetails = vi.fn();
    render(<ProductCard product={product} onViewDetails={onViewDetails} actions={<ProductPurchaseActions product={product} cartReady />} />);

    expect(screen.getByText(/Pão integral com frango/)).toBeDefined();
    expect(screen.getByText('2 un.')).toBeDefined();
    expect(screen.queryByText('Ver detalhes')).toBeNull();
    expect(screen.getByText('Lanches').parentElement?.className).toContain('absolute');
    const price = screen.getByText(/^R\$\s12,50$/).parentElement;
    expect(price?.querySelector('.text-xl')?.textContent).toBe('R$\u00a012');
    expect(price?.querySelector('.text-xs')?.textContent).toBe(',50');
    const stock = screen.getByText('2 un.').parentElement;
    expect(price?.parentElement).toBe(stock?.parentElement);
    expect(price?.parentElement?.className).toContain('flex items-start justify-between');
    expect(price?.parentElement?.firstElementChild).toBe(price);
    expect(price?.parentElement?.lastElementChild).toBe(stock);
    fireEvent.click(screen.getByRole('button', { name: 'Ver detalhes de Sanduíche natural' }));
    expect(onViewDetails).toHaveBeenCalledTimes(1);
    expect(useCartStore.getState().items).toEqual([]);

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar Sanduíche natural à sacola' }));
    expect(onViewDetails).toHaveBeenCalledTimes(1);
    expect(useCartStore.getState().items[0].quantity).toBe(1);
    expect(useCartStore.getState().total).toBe(12.5);
  });

  it('permite consultar produto sem estoque, mas não comprá-lo', () => {
    const soldOut = { ...product, stock: 0 };
    const onViewDetails = vi.fn();
    render(<ProductCard product={soldOut} onViewDetails={onViewDetails} actions={<ProductPurchaseActions product={soldOut} cartReady />} />);
    fireEvent.click(screen.getByRole('button', { name: /Ver detalhes/ }));
    expect(onViewDetails).toHaveBeenCalledOnce();
    expect(screen.getByText('Sem estoque')).toBeDefined();
    expect(screen.getByText('0 un.')).toBeDefined();
    expect((screen.getByRole('button', { name: /Adicionar/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('mantém a quantidade reativa e bloqueia incrementos no limite de estoque', () => {
    render(<ProductPurchaseActions product={product} cartReady />);
    fireEvent.click(screen.getByRole('button', { name: /Adicionar/ }));
    fireEvent.click(screen.getByRole('button', { name: /Aumentar/ }));
    expect(screen.getByRole('status').textContent).toBe('2');
    expect((screen.getByRole('button', { name: /Aumentar/ }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /Diminuir/ }));
    fireEvent.click(screen.getByRole('button', { name: /Diminuir/ }));
    expect(useCartStore.getState().items).toEqual([]);
    expect(screen.getByRole('button', { name: /Adicionar/ })).toBeDefined();
  });

  it('mantém card e drawer sincronizados sem duplicar o carrinho', () => {
    render(<>
      <section aria-label="Card"><ProductPurchaseActions product={product} cartReady /></section>
      <section aria-label="Detalhes"><ProductPurchaseActions product={product} cartReady /></section>
    </>);
    const card = within(screen.getByRole('region', { name: 'Card' }));
    const details = within(screen.getByRole('region', { name: 'Detalhes' }));
    fireEvent.click(details.getByRole('button', { name: /Adicionar/ }));
    expect(card.getByRole('status').textContent).toBe('1');
    fireEvent.click(card.getByRole('button', { name: /Aumentar/ }));
    expect(details.getByRole('status').textContent).toBe('2');
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().total).toBe(25);
  });

  it.each([
    { ready: false, changes: {} },
    { ready: true, changes: { availableToday: false } },
    { ready: true, changes: { active: false } },
  ])('não adiciona produto sem contexto pronto ou indisponível: %j', ({ ready, changes }) => {
    render(<ProductPurchaseActions product={{ ...product, ...changes }} cartReady={ready} />);
    const button = screen.getByRole('button', { name: /Adicionar/ }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    expect(useCartStore.getState().items).toEqual([]);
  });
});

describe('detalhes reativos do produto', () => {
  it('mostra descrição completa e acompanha alterações de estoque sem reabrir', async () => {
    await db.products.put(product);
    render(<ProductDetailsDrawer productId={product.id} />);
    await waitFor(() => expect(screen.getByRole('heading', { name: product.name })).toBeDefined());
    expect(screen.getByText(/Pão integral com frango/).className).toContain('whitespace-pre-wrap');
    fireEvent.click(screen.getByRole('button', { name: /Adicionar/ }));
    expect(screen.getByRole('status').textContent).toBe('1');

    await act(async () => { await db.products.update(product.id, { stock: 0, description: 'Nova descrição recebida durante a consulta.' }); });
    await waitFor(() => expect(screen.getByText('Nova descrição recebida durante a consulta.')).toBeDefined());
    expect((screen.getByRole('button', { name: /Aumentar/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('informa ausência de descrição sem inventar conteúdo', async () => {
    await db.products.put({ ...product, description: undefined });
    render(<ProductDetailsDrawer productId={product.id} />);
    await waitFor(() => expect(screen.getByText('Este produto ainda não possui descrição.')).toBeDefined());
  });

  it('não exibe produto de outro tenant', async () => {
    await db.products.put({ ...product, tenantId: 'tenant-b' });
    render(<ProductDetailsDrawer productId={product.id} />);
    await waitFor(() => expect(screen.getByText('Produto não disponível')).toBeDefined());
    expect(screen.queryByText(/Pão integral com frango/)).toBeNull();
    expect(screen.queryByRole('button', { name: /Adicionar/ })).toBeNull();
  });

  it('mantém os detalhes de gestão somente para consulta', async () => {
    await db.products.put(product);
    render(<ProductDetailsDrawer productId={product.id} allowPurchase={false} />);
    await waitFor(() => expect(screen.getByRole('heading', { name: product.name })).toBeDefined());
    expect(screen.queryByRole('button', { name: /Adicionar/ })).toBeNull();
  });
});

describe('card mobile de gestão', () => {
  it('separa preço/custo/estoque e preserva ações independentes', () => {
    const onViewDetails = vi.fn(); const onEdit = vi.fn(); const onDelete = vi.fn(); const onToggleAvailable = vi.fn();
    render(<ProductManagementCard product={product} canUpdate canDelete saving={false} onViewDetails={onViewDetails} onEdit={onEdit} onDelete={onDelete} onToggleAvailable={onToggleAvailable} />);
    expect(screen.getByText('Venda')).toBeDefined();
    expect(screen.getByText('Custo')).toBeDefined();
    expect(screen.getByText('Estoque')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /Editar/ }));
    fireEvent.click(screen.getByRole('button', { name: /Excluir/ }));
    expect(onEdit).toHaveBeenCalledOnce();
    expect(onDelete).toHaveBeenCalledOnce();
    expect(onViewDetails).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('switch', { name: /Disponível hoje/ }));
    expect(onToggleAvailable).toHaveBeenCalledWith(false);
  });

  it('não mostra controles de gestão sem permissão', () => {
    render(<ProductManagementCard product={product} canUpdate={false} canDelete={false} saving={false} onViewDetails={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} onToggleAvailable={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /Editar|Excluir/ })).toBeNull();
    expect(screen.queryByRole('switch')).toBeNull();
  });
});
