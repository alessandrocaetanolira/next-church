'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Download, Pause, Play, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { db } from '@/lib/db';
import { downloadBibleTranslation, pauseBibleDownload, removeBibleDownload, type BibleTranslation } from '@/features/bible/api/bible.api';
import { toast } from 'sonner';

type BibleDownloadControlProps = { translation: BibleTranslation };

export function BibleDownloadControl({ translation }: BibleDownloadControlProps) {
  const [busy, setBusy] = useState(false);
  const download = useLiveQuery(() => db.offlineBibleDownloads.get(translation), [translation]);
  const total = download?.totalChapters ?? 0;
  const completed = download?.downloadedChapters ?? 0;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const active = download?.status === 'downloading';
  const ready = download?.status === 'ready';

  const start = async () => {
    if (!ready && !window.confirm(`Baixar a versão ${translation} para leitura offline?`)) return;
    setBusy(true);
    try {
      await downloadBibleTranslation(translation);
      toast.success(`${translation} disponível para leitura offline.`);
    } catch {
      toast.error(`Não foi possível baixar a versão ${translation}.`);
    } finally {
      setBusy(false);
    }
  };

  const pause = async () => {
    await pauseBibleDownload(translation);
    toast.info(`Download de ${translation} pausado.`);
  };

  const remove = async () => {
    if (!window.confirm(`Remover o conteúdo offline de ${translation}?`)) return;
    await removeBibleDownload(translation);
    toast.success(`Conteúdo offline de ${translation} removido.`);
  };

  return <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
    <div className="flex items-center justify-between gap-2">
      <div>
        <p className="text-sm font-medium">Leitura offline</p>
        <p className="text-xs text-muted-foreground">{ready ? 'Disponível neste dispositivo' : download?.status === 'paused' ? `Pausado · ${completed}/${total} capítulos` : download?.status === 'error' ? `Erro · ${completed}/${total} capítulos` : download ? `${completed}/${total} capítulos` : 'Ainda não baixada'}</p>
      </div>
      <div className="flex shrink-0 gap-1">
        {active ? <Button type="button" size="icon" variant="outline" onClick={pause} aria-label={`Pausar download ${translation}`}><Pause className="h-4 w-4" /></Button> : <Button type="button" size="icon" variant="outline" onClick={start} disabled={busy} aria-label={`${ready ? 'Baixar novamente' : 'Baixar'} ${translation}`}>
          {download?.status === 'paused' ? <Play className="h-4 w-4" /> : <Download className="h-4 w-4" />}
        </Button>}
        {download && <Button type="button" size="icon" variant="ghost" onClick={remove} disabled={active} aria-label={`Remover ${translation} offline`}><Trash2 className="h-4 w-4" /></Button>}
      </div>
    </div>
    {download && !ready && <Progress value={percentage} aria-label={`${percentage}% baixado`} />}
  </div>;
}
