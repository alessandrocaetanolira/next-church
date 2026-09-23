import { afterEach, describe, expect, it } from 'vitest';
import { db } from '@/lib/db';

describe('schema offline Dexie', () => {
  afterEach(async () => {
    await db.offlineMetadata.clear();
    await db.offlineUserState.clear();
    await db.syncQueue.clear();
  });

  it('mantém metadados e sessão mínima separados por tenant e usuário', async () => {
    await db.offlineMetadata.bulkPut([
      { key: 'tenant-a:content', tenantSlug: 'tenant-a', userId: 'user-a', contentVersion: 'v1', updatedAt: new Date().toISOString() },
      { key: 'tenant-b:content', tenantSlug: 'tenant-b', userId: 'user-b', contentVersion: 'v2', updatedAt: new Date().toISOString() },
    ]);
    await db.offlineUserState.put({ key: 'tenant-a:user-a', tenantSlug: 'tenant-a', userId: 'user-a', role: 'MEMBER', lastAuthenticatedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });

    expect(await db.offlineMetadata.get('tenant-a:content')).toMatchObject({ tenantSlug: 'tenant-a', userId: 'user-a' });
    expect(await db.offlineMetadata.get('tenant-b:content')).toMatchObject({ tenantSlug: 'tenant-b', userId: 'user-b' });
    expect(await db.offlineUserState.get('tenant-a:user-a')).toMatchObject({ tenantSlug: 'tenant-a', userId: 'user-a' });
  });

  it('persiste retry e idempotência na fila', async () => {
    const id = await db.syncQueue.add({ module: 'tasks', action: 'update', data: { id: 'task-1' }, timestamp: new Date().toISOString(), tenantSlug: 'tenant-a', userId: 'user-a', status: 'error', retryCount: 2, lastError: 'network', idempotencyKey: 'tenant-a:task-1:update' });
    const item = await db.syncQueue.get(id);
    expect(item).toMatchObject({ status: 'error', retryCount: 2, idempotencyKey: 'tenant-a:task-1:update' });
  });
});

