/**
 * features/sync/services/sync-service.ts
 * 
 * Motor de sincronização Offline-First.
 * Gerencia Pull (download) e Push (upload) de dados.
 */

import { db, LocalMember, LocalProduct, LocalSale, LocalTask, SyncOutbox } from "@/lib/db";
import { syncRequest } from '@/services/sync/sync-api';
import { readSyncCursor, SyncContext, writeSyncCursor } from './sync-context';
import { generateId } from '@/lib/id';

function backoffDelay(retryCount: number) {
  return Math.min(30_000, 500 * (2 ** Math.min(retryCount, 6)));
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function summarizeSyncResults(results: Array<{ status: string }>) {
  const successes = results.filter((result) => result.status === 'success').length;
  const conflicts = results.filter((result) => result.status === 'conflict').length;
  const failures = results.filter((result) => result.status !== 'success' && result.status !== 'conflict').length;
  return {
    ok: conflicts === 0 && failures === 0,
    partial: successes > 0 && (conflicts > 0 || failures > 0),
    successes,
    conflicts,
    failures,
  };
}

export type ConflictResolution = 'server' | 'local';

export async function resolveSyncConflict(itemId: number, resolution: ConflictResolution, context?: SyncContext) {
  const item = await db.syncQueue.get(itemId);
  if (!item || item.status !== 'conflict') return false;
  if (!context || item.tenantSlug !== context.tenantSlug || item.userId !== context.userId) return false;
  if (resolution === 'local' && (item.conflictReason === 'idempotency' || item.conflictReason === 'unverifiable')) return false;

  const sources = await db.syncOutbox.filter((source) => source.userId === context.userId && source.tenantSlug === context.tenantSlug
    && (!context.tenantId || source.tenantId === context.tenantId)
    && (source.id === item.legacyOutboxId || `${source.id ?? 'new'}:${source.timestamp}` === item.idempotencyKey)).toArray();

  if (resolution === 'server') {
    await db.transaction('rw', db.syncQueue, db.syncOutbox, async () => {
      await db.syncQueue.delete(itemId);
      await db.syncOutbox.bulkDelete(sources.map((source) => source.id!));
    });
    return true;
  }

  const data = item.data && typeof item.data === 'object'
    ? { ...(item.data as Record<string, unknown>), updatedAt: new Date().toISOString() }
    : item.data;
  await db.transaction('rw', db.syncQueue, db.syncOutbox, async () => {
    await db.syncQueue.put({
    ...item,
    data,
    status: 'pending',
    retryCount: 0,
    lastError: undefined,
    idempotencyKey: generateId(),
    conflictReason: undefined,
    legacyOutboxId: undefined,
    });
    await db.syncOutbox.bulkDelete(sources.map((source) => source.id!));
  });
  return true;
}

const activePushes = new Map<string, Promise<Awaited<ReturnType<typeof performPush>>>>();

/** Duas rotinas da mesma janela compartilham o mesmo envio; o servidor protege concorrência entre janelas. */
export function pushChanges(context?: SyncContext) {
  const key = JSON.stringify(context ?? null);
  const active = activePushes.get(key);
  if (active) return active;
  const request = performPush(context).finally(() => { if (activePushes.get(key) === request) activePushes.delete(key); });
  activePushes.set(key, request);
  return request;
}

async function performPush(context?: SyncContext) {
  if (!context?.tenantId || !context.userId) return { ok: false, skipped: true, unauthorized: true };
  // Compatibilidade: mutações antigas ainda gravam em syncOutbox. Migre-as
  // para a fila explícita antes de enviar.
  const allLegacy = await db.syncOutbox.toArray();
  const legacy = allLegacy.filter((item) => item.tenantId === context.tenantId && item.userId === context.userId && item.tenantSlug === context.tenantSlug);
  if (legacy.length > 0) {
    const queued = await db.syncQueue.toArray();
    const existingKeys = new Set(queued.filter((item) => item.userId === context.userId && item.tenantSlug === context.tenantSlug).map((item) => item.idempotencyKey).filter(Boolean));
    const missing = legacy.filter((item) => !existingKeys.has(`${item.id ?? 'new'}:${item.timestamp}`));
    if (missing.length > 0) {
      await db.syncQueue.bulkAdd(missing.map(({ id, ...item }) => ({
        ...item, legacyOutboxId: id,
        ...(context ? { tenantSlug: context.tenantSlug, userId: context.userId } : {}),
        status: 'pending' as const,
        retryCount: 0,
        idempotencyKey: `${id ?? 'new'}:${item.timestamp}`,
      })));
    }
  }

  const scoped = (await db.syncQueue.where('status').anyOf('pending', 'error', 'processing').toArray())
    .filter((item) => item.tenantSlug === context.tenantSlug && item.userId === context.userId && (!item.tenantId || item.tenantId === context.tenantId))
    .slice(0, 100);
  const unverifiable = scoped.filter((item) => !item.idempotencyKey);
  if (unverifiable.length) await db.syncQueue.bulkPut(unverifiable.map((item) => ({ ...item, status: 'conflict' as const, conflictReason: 'unverifiable' as const, lastError: 'Operação antiga sem chave verificável. Confira o resultado antes de reenviar.' })));
  const pending = scoped.filter((item) => item.idempotencyKey);
  const blockedLegacy = allLegacy.filter((item) => !item.tenantId || !item.userId || !item.tenantSlug).length + unverifiable.length;
  if (pending.length === 0) return { ok: blockedLegacy === 0, skipped: blockedLegacy === 0, requiresReview: blockedLegacy };

  try {
    const retrying = pending.filter((item) => (item.retryCount ?? 0) > 0);
    if (retrying.length > 0) await wait(Math.max(...retrying.map((item) => backoffDelay(item.retryCount ?? 0))));
    await db.syncQueue.bulkPut(pending.map((item) => ({ ...item, status: 'processing' as const })));
    const response = await syncRequest<{ results?: Array<{ id: number; status: string; error?: string; reason?: string }> }>('/api/sync/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ changes: pending }),
    });

    if (!response.ok) {
      await db.syncQueue.bulkPut(pending.map((item) => ({ ...item, status: 'error' as const, retryCount: (item.retryCount ?? 0) + 1, lastError: `HTTP ${response.status}` })));
      if (response.status === 401 || response.status === 403) {
        return { ok: false, skipped: true, unauthorized: true };
      }

      return { ok: false, skipped: false, status: response.status };
    }

    const received = response.data?.results ?? [];
    const results = pending.map((item) => {
      const matches = received.filter((result) => result.id === item.id);
      return matches.length === 1 ? matches[0] : { id: item.id!, status: 'error' };
    });
    
    // Remover itens processados com sucesso da fila
    const successIds = results
      .filter((result) => result.status === 'success')
      .map((result) => result.id);
    
    if (successIds.length > 0) {
      await db.syncQueue.bulkDelete(successIds);
      const sourceIds = pending.filter((item) => successIds.includes(item.id ?? -1)).flatMap((item) => {
        const source = item.legacyOutboxId ?? legacy.find((source) => `${source.id ?? 'new'}:${source.timestamp}` === item.idempotencyKey)?.id;
        return source === undefined ? [] : [source];
      });
      if (sourceIds.length) await db.syncOutbox.bulkDelete(sourceIds);
    }

    const conflicts = results.filter((result) => result.status === 'conflict').map((result) => result.id);
    if (conflicts.length > 0) {
      const conflictItems = pending.filter((item) => conflicts.includes(item.id ?? -1));
      await db.syncQueue.bulkPut(conflictItems.map((item) => ({
        ...item,
        status: 'conflict' as const,
        conflictReason: received.find((result) => result.id === item.id)?.reason === 'idempotency' ? 'idempotency' as const : 'version' as const,
        lastError: received.find((result) => result.id === item.id)?.error ?? 'O registro foi alterado no servidor antes da sincronização.',
      })));
    }

    const failed = results.filter((result) => result.status !== 'success' && result.status !== 'conflict').map((result) => result.id);
    if (failed.length > 0) {
      const failedItems = pending.filter((item) => failed.includes(item.id ?? -1));
      await db.syncQueue.bulkPut(failedItems.map((item) => ({ ...item, status: 'error' as const, retryCount: (item.retryCount ?? 0) + 1 })));
    }

    return { ...summarizeSyncResults(results), ...(blockedLegacy ? { ok: false, requiresReview: blockedLegacy } : {}), skipped: false };
  } catch (error) {
    await db.syncQueue.bulkPut(pending.map((item) => ({ ...item, status: 'error' as const, retryCount: (item.retryCount ?? 0) + 1, lastError: error instanceof Error ? error.message : 'network error' })));
    return { ok: false, skipped: false, networkError: true };
  }
}

export async function pullChanges(context?: SyncContext) {
  const lastSync = context
    ? await readSyncCursor(context)
    : (typeof window !== 'undefined' ? window.localStorage.getItem('lastSync') : null) || new Date(0).toISOString();

  try {
    const response = await syncRequest<{
      sales?: LocalSale[];
      products?: LocalProduct[];
      members?: LocalMember[];
      tasks?: LocalTask[];
      timestamp?: string;
    }>(`/api/sync/pull?lastSync=${lastSync}`);

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return { ok: false, skipped: true, unauthorized: true };
      }

      return { ok: false, skipped: false, status: response.status };
    }

    const data = response.data ?? {};

    await db.transaction('rw', db.sales, db.products, db.members, db.tasks, async () => {
      if (data.sales) {
        const mergedSales = await Promise.all(
          data.sales.map(async (sale) => {
            const existing = await db.sales.get(sale.id);
            return {
              ...sale,
              ...(context ? { tenantId: context.tenantId, tenantSlug: context.tenantSlug } : {}),
              orderStatus: sale.orderStatus ?? existing?.orderStatus,
              _status: 'synced' as const,
            };
          })
        );
        await db.sales.bulkPut(mergedSales);
      }
      if (data.products) {
        const products = await Promise.all(data.products.map(async (item) => {
          const existing = await db.products.get(item.id);
          const tenantId = context?.tenantId ?? item.tenantId;
          const keepRecommendation = Boolean(tenantId) && existing?.tenantId === tenantId && item.recommended === undefined;
          return {
            ...(keepRecommendation ? { recommended: existing?.recommended, recommendationCalculatedAt: existing?.recommendationCalculatedAt } : {}),
            ...item,
            ...(context ? { tenantId: context.tenantId, tenantSlug: context.tenantSlug } : {}),
          };
        }));
        await db.products.bulkPut(products);
      }
      if (data.members) await db.members.bulkPut(data.members.map((item) => context ? { ...item, tenantId: context.tenantId, tenantSlug: context.tenantSlug } : item));
      if (data.tasks) await db.tasks.bulkPut(data.tasks.map((item) => context ? { ...item, tenantId: context.tenantId, tenantSlug: context.tenantSlug } : item));
    });

    if (data.timestamp) {
      if (context) {
        await writeSyncCursor(context, data.timestamp);
      } else if (typeof window !== 'undefined') {
        window.localStorage.setItem('lastSync', data.timestamp);
      }
    }
    return { ok: true, skipped: false };
  } catch (error) {
    return { ok: false, skipped: false, networkError: true };
  }
}

/**
 * Inicia o ciclo de sincronização completo.
 */
export async function syncAll(context?: SyncContext) {
  if (!navigator.onLine) return { ok: false, skipped: true, offline: true };
  await pushChanges(context);
  return pullChanges(context);
}
