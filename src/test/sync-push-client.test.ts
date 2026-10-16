import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/lib/db';
import { useAuthStore } from '@/features/auth/store';
import { enqueueSyncChange } from '@/features/sync/services/enqueue-sync-change';
import { pushChanges, resolveSyncConflict } from '@/features/sync/services/sync-service';

const request = vi.hoisted(() => vi.fn());
vi.mock('@/services/sync/sync-api', () => ({ syncRequest: request }));
const context = { tenantId: 'tenant-a', tenantSlug: 'church-a', userId: 'user-a' };
const change = { module: 'sales' as const, action: 'create' as const, data: { id: 'sale-a' }, timestamp: '2026-10-16T12:00:00Z' };

beforeEach(async () => {
  vi.clearAllMocks();
  await db.syncQueue.clear(); await db.syncOutbox.clear();
  useAuthStore.getState().setSession({ id: 'user-a', tenantId: 'tenant-a', tenantSlug: 'church-a', churchId: 'tenant-a', name: 'Ana', email: 'ana@test.local', role: 'MEMBER', permissions: ['canteen:order'], teamIds: [], accessibleModules: [] }, 'tenant-a');
  request.mockImplementation(async (_url, init) => ({ ok: true, status: 200, data: { results: JSON.parse(init.body).changes.map((item: { id: number }) => ({ id: item.id, status: 'success' })) } }));
});

describe('fila de sync com autoria e confirmação verificáveis', () => {
  it('captura ator/tenant ao enfileirar e não atribui legado sem dono ao login atual', async () => {
    await enqueueSyncChange(change);
    await db.syncOutbox.add({ ...change, data: { id: 'unscoped' } });
    await pushChanges(context);
    const sent = JSON.parse(request.mock.calls[0][1].body).changes;
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ userId: 'user-a', tenantId: 'tenant-a', tenantSlug: 'church-a' });
    expect(await db.syncOutbox.count()).toBe(1);
    expect((await db.syncOutbox.toArray())[0].data).toEqual({ id: 'unscoped' });
  });

  it('não remove outbox de outra pessoa quando o número do ID da fila coincide', async () => {
    const other = await db.syncOutbox.add({ ...change, userId: 'user-b', tenantId: 'tenant-b', tenantSlug: 'church-b' });
    await db.syncQueue.add({ ...change, ...context, id: other, idempotencyKey: 'owned-operation', status: 'pending' });
    await pushChanges(context);
    expect(await db.syncQueue.count()).toBe(0);
    expect(await db.syncOutbox.get(other)).toBeDefined();
  });

  it('recupera processing com a mesma chave e bloqueia entrada antiga sem chave', async () => {
    await db.syncQueue.add({ ...change, ...context, idempotencyKey: 'in-flight-key', status: 'processing' });
    const unverified = await db.syncQueue.add({ ...change, ...context, status: 'pending' });
    await pushChanges(context);
    expect(JSON.parse(request.mock.calls[0][1].body).changes[0].idempotencyKey).toBe('in-flight-key');
    expect(await db.syncQueue.get(unverified)).toMatchObject({ status: 'conflict' });
    expect(await db.syncQueue.count()).toBe(1);
  });

  it('não envia filas de outro usuário/tenant nem inicia push sem contexto', async () => {
    await db.syncQueue.add({ ...change, ...context, idempotencyKey: 'another', status: 'pending' });
    await pushChanges({ tenantId: 'tenant-b', tenantSlug: 'church-b', userId: 'user-b' });
    await pushChanges();
    expect(request).not.toHaveBeenCalled();
    expect(await db.syncQueue.count()).toBe(1);
  });

  it('não confirma item sem resposta correspondente e compartilha envio concorrente da janela', async () => {
    const id = await db.syncQueue.add({ ...change, ...context, idempotencyKey: 'ack-missing', status: 'pending' });
    request.mockResolvedValue({ ok: true, status: 200, data: { results: [{ id: 999999, status: 'success' }] } });
    await Promise.all([pushChanges(context), pushChanges(context)]);
    expect(request).toHaveBeenCalledTimes(1);
    expect(await db.syncQueue.get(id)).toMatchObject({ status: 'error', idempotencyKey: 'ack-missing' });
  });

  it('conflito de idempotência não pode gerar outra chave e repetir cobrança pelo botão Local', async () => {
    const id = await db.syncQueue.add({ ...change, ...context, idempotencyKey: 'receipt-exists', status: 'pending' });
    request.mockResolvedValue({ ok: true, status: 200, data: { results: [{ id, status: 'conflict', reason: 'idempotency', error: 'Confira a operação existente.' }] } });
    await pushChanges(context);
    expect(await db.syncQueue.get(id)).toMatchObject({ status: 'conflict', conflictReason: 'idempotency' });
    expect(await resolveSyncConflict(id, 'local', context)).toBe(false);
    expect(await db.syncQueue.get(id)).toHaveProperty('idempotencyKey', 'receipt-exists');
  });
});
