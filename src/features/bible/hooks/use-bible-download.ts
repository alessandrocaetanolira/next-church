'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { toast } from 'sonner';
import { db } from '@/lib/db';
import { useConnectivity } from '@/hooks/use-connectivity';
import { downloadBibleTranslation, pauseBibleDownload, removeBibleDownload, type BibleTranslation } from '../api/bible.api';

/** O progresso vem do Dexie, inclusive com o drawer aberto. Não mantém uma cópia em React/Zustand. */
export function useBibleDownload(translation: BibleTranslation) {
  const result = useLiveQuery(async () => ({ download: await db.offlineBibleDownloads.get(translation) }), [translation]);
  const online = useConnectivity();
  const [starting, setStarting] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const download = result?.download;
  const active = download?.status === 'downloading';
  const ready = download?.status === 'ready';
  const busy = starting || pausing || removing;
  const loading = result === undefined;

  const start = async () => {
    if (!online || loading || busy || active) return;
    setStarting(true); setActionError(null);
    try {
      const completed = await downloadBibleTranslation(translation);
      // Pausar resolve a mesma Promise; não anunciar conclusão antes de ficar ready.
      if (completed.status === 'ready') toast.success(`${translation} disponível para leitura offline.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : `Não foi possível baixar a versão ${translation}.`;
      setActionError(message); toast.error(message);
    } finally { setStarting(false); }
  };
  const pause = async () => {
    if (!active || pausing || removing) return;
    setPausing(true); setActionError(null);
    try {
      const paused = await pauseBibleDownload(translation);
      if (paused?.status === 'paused') toast.info(`Download de ${translation} pausado.`);
    } catch { setActionError('Não foi possível pausar. Tente novamente.'); }
    finally { setPausing(false); }
  };
  const remove = async () => {
    if (!download || active || busy) return false;
    setRemoving(true); setActionError(null);
    try {
      await removeBibleDownload(translation);
      toast.success(`Conteúdo offline de ${translation} removido.`);
      return true;
    } catch { setActionError('Não foi possível remover esta versão. Tente novamente.'); return false; }
    finally { setRemoving(false); }
  };

  const total = Math.max(0, download?.totalChapters ?? 0);
  const completed = Math.min(total, Math.max(0, download?.downloadedChapters ?? 0));
  return { download, online, loading, starting, pausing, removing, busy, active, ready, total, completed,
    percentage: total > 0 ? Math.round(completed / total * 100) : 0,
    error: actionError ?? (download?.status === 'error' ? download.lastError ?? 'Não foi possível concluir o download.' : null),
    start, pause, remove };
}
