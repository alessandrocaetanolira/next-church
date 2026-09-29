import { db, type LocalSale } from '@/lib/db';

export async function queueSaleCreate(sale: LocalSale) {
  await db.sales.put({ ...sale, _status: 'pending' });
  await db.syncOutbox.add({ module: 'sales', action: 'create', data: sale, timestamp: new Date().toISOString() });
}

export async function queueSaleUpdate(id: string, data: Record<string, unknown>, localPatch: Partial<LocalSale> = {}) {
  const updatedAt = new Date().toISOString();
  await db.sales.update(id, { ...localPatch, updatedAt, _status: 'pending' });
  await db.syncOutbox.add({ module: 'sales', action: 'update', data: { id, ...data, updatedAt }, timestamp: updatedAt });
}
