import { beforeEach, describe, expect, it } from 'vitest';
import { db, type LocalSale } from '@/lib/db';
import { queueSaleCreate, queueSaleUpdate } from '@/features/canteen/lib/offline-sales';

const sale: LocalSale = {
  id: 'sale-offline-1',
  tenantId: 'igreja-teste',
  total: 18.5,
  paymentMethod: 'pending',
  items: [{ productId: 'product-1', name: 'Café', quantity: 1, price: 18.5 }],
  orderStatus: 'pending',
  memberId: 'member-1',
  memberName: 'Membro Teste',
  createdBy: 'member-1',
  createdAt: '2026-09-29T12:00:00.000Z',
  updatedAt: '2026-09-29T12:00:00.000Z',
  _status: 'synced',
};

describe('sincronização offline da cantina', () => {
  beforeEach(async () => {
    await db.sales.clear();
    await db.syncOutbox.clear();
  });

  it('persiste uma venda criada offline e a coloca na outbox', async () => {
    await queueSaleCreate(sale);

    await expect(db.sales.get(sale.id)).resolves.toMatchObject({
      id: sale.id,
      _status: 'pending',
      total: sale.total,
    });

    await expect(db.syncOutbox.toArray()).resolves.toEqual([
      expect.objectContaining({
        module: 'sales',
        action: 'create',
        data: sale,
      }),
    ]);
  });

  it('atualiza localmente o status e preserva a operação para retry online', async () => {
    await db.sales.put(sale);

    await queueSaleUpdate(
      sale.id,
      { action: 'status', orderStatus: 'ready' },
      { orderStatus: 'ready' },
    );

    const local = await db.sales.get(sale.id);
    expect(local).toMatchObject({ id: sale.id, orderStatus: 'ready', _status: 'pending' });
    expect(local?.updatedAt).toEqual(expect.any(String));

    const [queued] = await db.syncOutbox.toArray();
    expect(queued).toMatchObject({
      module: 'sales',
      action: 'update',
      data: expect.objectContaining({ id: sale.id, action: 'status', orderStatus: 'ready' }),
    });
  });

  it('marca pedido pronto como arquivado sem removê-lo da base local antes do sync', async () => {
    await db.sales.put({ ...sale, orderStatus: 'ready' });

    await queueSaleUpdate(
      sale.id,
      { action: 'archive' },
      { deletedAt: '2026-09-29T12:05:00.000Z' },
    );

    const local = await db.sales.get(sale.id);
    expect(local).toMatchObject({ id: sale.id, deletedAt: '2026-09-29T12:05:00.000Z', _status: 'pending' });
    await expect(db.syncOutbox.where('action').equals('update').count()).resolves.toBe(1);
  });
});
