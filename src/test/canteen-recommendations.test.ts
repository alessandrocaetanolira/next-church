import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CanteenProductsRepository } from '@/server/canteen/products.repository';
import { CanteenProductsService } from '@/server/canteen/products.service';
import { isRecommendedProduct } from '@/lib/canteen/product-recommendation';

const now = new Date('2026-10-15T15:00:00Z');
type Product = Awaited<ReturnType<CanteenProductsRepository['list']>>[number];
function product(id: string, changes: Partial<Product> = {}): Product {
  return { id, name: id, description: null, imageUrl: null, price: 10, cost: 5, stock: 10, minStock: 1,
    category: 'Lanches', active: true, availableToday: true, createdAt: now, updatedAt: now, deletedAt: null, ...changes };
}
function repository(products: Product[], sales: Array<{ items: string }>) {
  return { list: vi.fn().mockResolvedValue(products), listConfirmedSaleItems: vi.fn().mockResolvedValue(sales) } as unknown as CanteenProductsRepository;
}
function sale(productId: string, quantity: number, price = 10) {
  return { items: JSON.stringify([{ productId, name: productId, quantity, price }]) };
}

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(now); });
afterEach(() => { vi.useRealTimers(); });

describe('recomendação por vendas da Cantina', () => {
  it('usa unidades vendidas, não faturamento nem quantidade de pedidos', async () => {
    const repo = repository([product('lanche'), product('bebida')], [sale('lanche', 1, 100), sale('lanche', 1, 100), sale('bebida', 3, 2)]);
    const result = await new CanteenProductsService(repo, 'tenant-a').list();
    expect(result.find((item) => item.id === 'bebida')?.recommended).toBe(true);
    expect(result.find((item) => item.id === 'lanche')?.recommended).toBe(false);
    expect(repo.listConfirmedSaleItems).toHaveBeenCalledWith(new Date('2026-09-15T15:00:00Z'), now);
    expect(result[0].recommendationCalculatedAt).toBe(now.toISOString());
    expect(result[0]).not.toHaveProperty('unitsSold');
    expect(result[0]).not.toHaveProperty('sales');
  });

  it('mostra todos os líderes em caso de empate, sem recomendar quem não vendeu', async () => {
    const repo = repository([product('a'), product('b'), product('c')], [sale('a', 4), sale('b', 4)]);
    const result = await new CanteenProductsService(repo, 'tenant-a').list();
    expect(result.filter((item) => item.recommended).map((item) => item.id)).toEqual(['a', 'b']);
  });

  it('não mostra destaque sem histórico de vendas válido', async () => {
    const repo = repository([product('a')], [{ items: 'JSON inválido' }, { items: '{}' }, { items: '[null,{}, {"quantity": 2}, {"productId":"a","quantity":-3}]' }]);
    expect((await new CanteenProductsService(repo, 'tenant-a').list())[0].recommended).toBe(false);
  });

  it('destaca apenas produtos ativos, disponíveis hoje e com estoque', async () => {
    const repo = repository([product('inativo', { active: false }), product('indisponivel', { availableToday: false }), product('esgotado', { stock: 0 }), product('disponivel')],
      [sale('inativo', 90), sale('indisponivel', 80), sale('esgotado', 70), sale('disponivel', 2)]);
    const result = await new CanteenProductsService(repo, 'tenant-a').list();
    expect(result.filter((item) => item.recommended).map((item) => item.id)).toEqual(['disponivel']);
  });

  it('consulta somente vendas confirmadas no período, incluindo fiado e arquivadas', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const repo = new CanteenProductsRepository({ sale: { findMany } } as never);
    await repo.listConfirmedSaleItems(new Date('2026-09-15T15:00:00Z'), now);
    const args = findMany.mock.calls[0][0];
    expect(args).toEqual({ where: {
      createdAt: { gte: new Date('2026-09-15T15:00:00Z'), lte: now },
      paymentMethod: { notIn: ['pending', 'cancelled'] },
      OR: [{ orderStatus: null }, { orderStatus: { not: 'cancelled' } }],
    }, select: { items: true } });
    expect(args).not.toHaveProperty('take');
    expect(args.where).not.toHaveProperty('deletedAt');
  });
});

describe('destaque com a última cópia offline', () => {
  it('aceita somente metadados válidos vindos do servidor e produto disponível', () => {
    const item = { ...product('a'), recommended: true, recommendationCalculatedAt: now.toISOString() };
    expect(isRecommendedProduct(item)).toBe(true);
    expect(isRecommendedProduct({ ...item, recommended: false })).toBe(false);
    expect(isRecommendedProduct({ ...item, stock: 0 })).toBe(false);
    expect(isRecommendedProduct({ ...item, recommendationCalculatedAt: undefined })).toBe(false);
    expect(isRecommendedProduct({ ...item, recommendationCalculatedAt: '2026-09-01T15:00:00Z' })).toBe(false);
    expect(isRecommendedProduct({ ...item, recommendationCalculatedAt: '2026-10-16T15:00:00Z' })).toBe(false);
  });
});
