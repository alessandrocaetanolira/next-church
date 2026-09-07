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

export async function pushChanges() {
  const pending = await db.syncOutbox.toArray();
  if (pending.length === 0) return { ok: true, skipped: true };

  try {
    const response = await performRequest<{ results?: Array<{ id: number; status: string }> }>('/api/sync/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ changes: pending }),
    });

    if (!response.ok) {
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
      await db.syncOutbox.bulkDelete(successIds);
    }

    return { ok: true, skipped: false };
  } catch (error) {
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
