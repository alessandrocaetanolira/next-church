import { afterEach, describe, expect, it } from 'vitest';
import { db } from '@/lib/db';
import { getSyncCursorKey, readSyncCursor, writeSyncCursor } from '@/features/sync/services/sync-context';
import { resolveSyncConflict, summarizeSyncResults } from '@/features/sync/services/sync-service';

describe('cursor de sincronização offline', () => {
  afterEach(async () => {
    await db.offlineMetadata.clear();
    await db.syncQueue.clear();
    window.localStorage.clear();
  });

  it('mantém cursores independentes por tenant e usuário', async () => {
    const first = { tenantSlug: 'tenant-a', userId: 'user-a' };
    const second = { tenantSlug: 'tenant-b', userId: 'user-b' };

    await writeSyncCursor(first, '2026-01-01T00:00:00.000Z');
    await writeSyncCursor(second, '2026-02-01T00:00:00.000Z');

    expect(await readSyncCursor(first)).toBe('2026-01-01T00:00:00.000Z');
    expect(await readSyncCursor(second)).toBe('2026-02-01T00:00:00.000Z');
    expect(await db.offlineMetadata.get(getSyncCursorKey(first))).toMatchObject({ tenantSlug: 'tenant-a', userId: 'user-a' });
  });

  it('migra o cursor legado para o primeiro contexto e o remove', async () => {
    window.localStorage.setItem('lastSync', '2026-03-01T00:00:00.000Z');
    const context = { tenantSlug: 'tenant-a', userId: 'user-a' };

    expect(await readSyncCursor(context)).toBe('2026-03-01T00:00:00.000Z');
    expect(window.localStorage.getItem('lastSync')).toBeNull();
    expect(await readSyncCursor({ tenantSlug: 'tenant-b', userId: 'user-b' })).toBe(new Date(0).toISOString());
  });

  it('resume lote parcialmente sincronizado', () => {
    expect(summarizeSyncResults([
      { status: 'success' },
      { status: 'conflict' },
      { status: 'error' },
    ])).toEqual({ ok: false, partial: true, successes: 1, conflicts: 1, failures: 1 });
  });

  it('permite descartar conflito do servidor ou recolocar a versão local na fila', async () => {
    const context = { tenantSlug: 'tenant-a', userId: 'user-a' };
    const id = await db.syncQueue.add({ module: 'tasks', action: 'update', data: { id: 'task-1', updatedAt: '2026-01-01T00:00:00.000Z' }, timestamp: new Date().toISOString(), tenantSlug: context.tenantSlug, userId: context.userId, status: 'conflict', retryCount: 2 });

    await expect(resolveSyncConflict(id, 'local', context)).resolves.toBe(true);
    await expect(db.syncQueue.get(id)).resolves.toMatchObject({ status: 'pending', retryCount: 0 });
    await db.syncQueue.update(id, { status: 'conflict' });
    await expect(resolveSyncConflict(id, 'server', context)).resolves.toBe(true);
    await expect(db.syncQueue.get(id)).resolves.toBeUndefined();
  });
});
