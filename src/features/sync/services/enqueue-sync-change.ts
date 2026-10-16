'use client';

import { db, type SyncOutbox } from '@/lib/db';
import { useAuthStore } from '@/features/auth/store';

/** Captura o dono na criação, nunca atribui uma outbox antiga ao usuário que fizer login depois. */
export function enqueueSyncChange(change: Omit<SyncOutbox, 'id' | 'tenantId' | 'tenantSlug' | 'userId' | 'legacyOutboxId'>) {
  const user = useAuthStore.getState().user;
  if (!user?.id || !user.tenantId) throw new Error('Sessão indisponível para preservar a operação offline.');
  const dataTenant = change.data && typeof change.data === 'object' ? (change.data as { tenantId?: unknown }).tenantId : undefined;
  if (dataTenant && dataTenant !== user.tenantId) throw new Error('A operação pertence a outra igreja.');
  return db.syncOutbox.add({ ...change, tenantId: user.tenantId, tenantSlug: user.tenantSlug || user.tenantId, userId: user.id });
}
