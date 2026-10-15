import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db, type LocalProduct } from '@/lib/db';
import { syncCanteenProductsFromServer } from '@/features/canteen/lib/sync-products';
import { pullChanges } from '@/features/sync/services/sync-service';

const runtime = vi.hoisted(() => ({ list: vi.fn(), syncRequest: vi.fn() }));
vi.mock('@/services/canteen/products-api', () => ({ listCanteenProducts: runtime.list }));
vi.mock('@/services/sync/sync-api', () => ({ syncRequest: runtime.syncRequest }));
const product: LocalProduct = { id: 'a', tenantId: 'tenant-a', name: 'Água', price: 5, category: 'Bebidas', stock: 10,
  createdAt: '2026-10-15T12:00:00Z', updatedAt: '2026-10-15T12:00:00Z', deletedAt: null };
const context = { tenantId: 'tenant-a', tenantSlug: 'tenant-a', userId: 'user-a' };
const recommendation = { recommended: true, recommendationCalculatedAt: '2026-10-15T12:00:00Z' };
beforeEach(async () => {
  vi.clearAllMocks();
  await db.products.clear(); await db.offlineMetadata.clear();
  window.localStorage.clear();
});

describe('cache do destaque Recomendado', () => {
  it('persiste o destaque retornado pelo catálogo e mantém durante o pull incremental', async () => {
    runtime.list.mockResolvedValue([{ ...product, ...recommendation }]);
    await syncCanteenProductsFromServer('tenant-a');
    expect(await db.products.get('a')).toMatchObject(recommendation);
    runtime.syncRequest.mockResolvedValue({ ok: true, status: 200, data: { products: [{ ...product, stock: 9 }] } });
    expect((await pullChanges(context)).ok).toBe(true);
    expect(await db.products.get('a')).toMatchObject({ ...recommendation, stock: 9 });
  });

  it('substitui o resultado antigo quando chega uma recomendação atualizada', async () => {
    await db.products.put({ ...product, ...recommendation });
    runtime.syncRequest.mockResolvedValue({ ok: true, status: 200, data: { products: [{ ...product, recommended: false, recommendationCalculatedAt: '2026-10-15T13:00:00Z' }] } });
    await pullChanges(context);
    expect((await db.products.get('a'))?.recommended).toBe(false);
  });

  it('nunca preserva o destaque de outro tenant com o mesmo ID', async () => {
    await db.products.put({ ...product, tenantId: 'tenant-b', ...recommendation });
    runtime.syncRequest.mockResolvedValue({ ok: true, status: 200, data: { products: [product] } });
    await pullChanges(context);
    expect(await db.products.get('a')).toMatchObject({ tenantId: 'tenant-a' });
    expect((await db.products.get('a'))?.recommended).toBeUndefined();
  });
});
