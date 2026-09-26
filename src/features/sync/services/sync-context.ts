import { db } from "@/lib/db";

export interface SyncContext {
  tenantSlug: string;
  userId: string;
}

const LEGACY_CURSOR_KEY = "lastSync";

export function getSyncCursorKey(context: SyncContext) {
  return `sync:last:${encodeURIComponent(context.tenantSlug)}:${encodeURIComponent(context.userId)}`;
}

export async function readSyncCursor(context: SyncContext) {
  const key = getSyncCursorKey(context);
  const metadata = await db.offlineMetadata.get(key);
  if (metadata?.lastSyncAt) return metadata.lastSyncAt;

  // Migra o cursor antigo uma única vez. Ele nunca volta a ser usado como
  // estado compartilhado depois que o contexto atual for identificado.
  const legacyCursor = typeof window !== "undefined"
    ? window.localStorage.getItem(LEGACY_CURSOR_KEY)
    : null;
  if (legacyCursor) {
    await writeSyncCursor(context, legacyCursor);
    window.localStorage.removeItem(LEGACY_CURSOR_KEY);
    return legacyCursor;
  }

  return new Date(0).toISOString();
}

export async function writeSyncCursor(context: SyncContext, lastSyncAt: string) {
  const key = getSyncCursorKey(context);
  await db.offlineMetadata.put({
    key,
    tenantSlug: context.tenantSlug,
    userId: context.userId,
    lastSyncAt,
    updatedAt: new Date().toISOString(),
  });
}
