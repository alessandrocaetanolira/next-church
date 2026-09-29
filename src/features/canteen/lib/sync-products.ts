import { db, type LocalProduct } from '@/lib/db';
import { listCanteenProducts } from '@/services/canteen/products-api';

export async function syncCanteenProductsFromServer(tenantId: string) {
  if (!tenantId) return [] as LocalProduct[];

  const remote = await listCanteenProducts<LocalProduct[]>();
  if (!Array.isArray(remote)) throw new Error('Resposta inválida ao buscar produtos da cantina.');

  // tenantId ainda não é índice Dexie; filtrar aqui evita alterar o schema
  // local apenas para sincronização de produtos.
  const local = (await db.products.toArray()).filter((product) => product.tenantId === tenantId);
  const pendingIds = new Set(local.filter((product) => product._status === 'pending' || product._status === 'error').map((product) => product.id));
  const normalized = remote.map((product) => ({
    ...product,
    tenantId,
    active: product.active ?? true,
    availableToday: product.availableToday ?? true,
    deletedAt: product.deletedAt ?? null,
    _status: 'synced' as const,
  }));
  const remoteIds = new Set(normalized.map((product) => product.id));

  await db.transaction('rw', db.products, async () => {
    // Nunca sobrescreve uma alteração local que ainda está na fila.
    await db.products.bulkPut(normalized.filter((product) => !pendingIds.has(product.id)));

    // Remove somente registros sincronizados que deixaram de existir no servidor.
    const staleIds = local
      .filter((product) => product._status !== 'pending' && product._status !== 'error' && !remoteIds.has(product.id))
      .map((product) => product.id);
    if (staleIds.length) await db.products.bulkDelete(staleIds);

    const deletedIds = normalized
      .filter((product) => product.deletedAt && !pendingIds.has(product.id))
      .map((product) => product.id);
    if (deletedIds.length) await db.products.bulkDelete(deletedIds);
  });

  return normalized.filter((product) => !product.deletedAt);
}
