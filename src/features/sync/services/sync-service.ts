/**
 * features/sync/services/sync-service.ts
 * 
 * Motor de sincronização Offline-First.
 * Gerencia Pull (download) e Push (upload) de dados.
 */

import { db, LocalMember, LocalProduct, LocalSale, LocalTask, SyncOutbox } from "@/lib/db";

interface SyncResponse<T> {
  ok: boolean;
  status: number;
  data?: T;
}

async function safeJson<T>(response: Response): Promise<T | undefined> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

async function performRequest<T>(input: RequestInfo | URL, init?: RequestInit): Promise<SyncResponse<T>> {
  const response = await fetch(input, init);
  const data = await safeJson<T>(response);
  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

function backoffDelay(retryCount: number) {
  return Math.min(30_000, 500 * (2 ** Math.min(retryCount, 6)));
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function pushChanges() {
  // Compatibilidade: mutações antigas ainda gravam em syncOutbox. Migre-as
  // para a fila explícita antes de enviar.
  const legacy = await db.syncOutbox.toArray();
  if (legacy.length > 0) {
    const queued = await db.syncQueue.toArray();
    const existingKeys = new Set(queued.map((item) => item.idempotencyKey).filter(Boolean));
    const missing = legacy.filter((item) => !existingKeys.has(`${item.id ?? 'new'}:${item.timestamp}`));
    if (missing.length > 0) {
      await db.syncQueue.bulkAdd(missing.map((item) => ({
        ...item,
        status: 'pending' as const,
        retryCount: 0,
        idempotencyKey: `${item.id ?? 'new'}:${item.timestamp}`,
      })));
    }
  }

  const pending = await db.syncQueue.where('status').anyOf('pending', 'error').toArray();
  if (pending.length === 0) return { ok: true, skipped: true };

  try {
    const retrying = pending.filter((item) => (item.retryCount ?? 0) > 0);
    if (retrying.length > 0) await wait(Math.max(...retrying.map((item) => backoffDelay(item.retryCount ?? 0))));
    await db.syncQueue.bulkPut(pending.map((item) => ({ ...item, status: 'processing' as const })));
    const response = await performRequest<{ results?: Array<{ id: number; status: string }> }>('/api/sync/push', {
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

    const results = response.data?.results ?? [];
    
    // Remover itens processados com sucesso da fila
    const successIds = results
      .filter((result) => result.status === 'success')
      .map((result) => result.id);
    
    if (successIds.length > 0) {
      await db.syncQueue.bulkDelete(successIds);
      await db.syncOutbox.bulkDelete(successIds);
    }

    const failed = results.filter((result) => result.status !== 'success').map((result) => result.id);
    if (failed.length > 0) {
      const failedItems = pending.filter((item) => failed.includes(item.id ?? -1));
      await db.syncQueue.bulkPut(failedItems.map((item) => ({ ...item, status: 'error' as const, retryCount: (item.retryCount ?? 0) + 1 })));
    }

    return { ok: true, skipped: false };
  } catch (error) {
    await db.syncQueue.bulkPut(pending.map((item) => ({ ...item, status: 'error' as const, retryCount: (item.retryCount ?? 0) + 1, lastError: error instanceof Error ? error.message : 'network error' })));
    return { ok: false, skipped: false, networkError: true };
  }
}

export async function pullChanges() {
  const lastSync = localStorage.getItem('lastSync') || new Date(0).toISOString();

  try {
    const response = await performRequest<{
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
              orderStatus: sale.orderStatus ?? existing?.orderStatus,
              _status: 'synced' as const,
            };
          })
        );
        await db.sales.bulkPut(mergedSales);
      }
      if (data.products) await db.products.bulkPut(data.products);
      if (data.members) await db.members.bulkPut(data.members);
      if (data.tasks) await db.tasks.bulkPut(data.tasks);
    });

    if (data.timestamp) {
      localStorage.setItem('lastSync', data.timestamp);
    }
    return { ok: true, skipped: false };
  } catch (error) {
    return { ok: false, skipped: false, networkError: true };
  }
}

/**
 * Inicia o ciclo de sincronização completo.
 */
export async function syncAll() {
  if (!navigator.onLine) return { ok: false, skipped: true, offline: true };
  await pushChanges();
  return pullChanges();
}
