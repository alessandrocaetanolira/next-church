'use client';

import { useId, useState } from 'react';
import { Check, CheckCircle2, CloudDownload, Pause, Trash2, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DownloadProgressButton, type DownloadButtonState } from '@/components/shared/DownloadProgressButton';
import type { BibleTranslation } from '../api/bible.api';
import { useBibleDownload } from '../hooks/use-bible-download';
import { BIBLE_TRANSLATIONS } from '../lib/translations';

type BibleDownloadControlProps = { translation: BibleTranslation; selected?: boolean; onSelect?: () => void };

/** Card reutilizado no drawer e nas configurações, com ações explícitas e progresso real. */
export function BibleDownloadControl({ translation, selected = false, onSelect }: BibleDownloadControlProps) {
  const download = useBibleDownload(translation);
  const [confirmRemoval, setConfirmRemoval] = useState(false);
  const confirmationId = useId();
  const name = BIBLE_TRANSLATIONS.find((item) => item.code === translation)?.name ?? translation;
  const state: DownloadButtonState = download.active ? 'downloading' : download.download?.status === 'paused' ? 'paused'
    : download.starting ? 'preparing' : download.ready ? 'ready'
    : download.error ? 'error' : 'idle';
  const statusLabel = download.loading ? 'Carregando…' : download.ready ? 'Disponível offline'
    : download.active ? 'Baixando' : download.download?.status === 'paused' ? 'Pausado'
    : download.starting ? 'Preparando…' : download.error ? 'Download interrompido' : 'Não baixada';
  const hasConfirmation = confirmRemoval && Boolean(download.download);

  return (
    <article aria-label={`Versão ${translation}`} className="min-w-0 space-y-4 rounded-xl border border-border/60 bg-card p-4 text-card-foreground">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-11 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold">{translation}</span>
        <div className="min-w-0 flex-1"><h3 className="text-sm font-semibold leading-5 [overflow-wrap:anywhere]">{name}</h3><p className="mt-1 text-xs text-muted-foreground">Versão {translation}</p></div>
        {onSelect ? selected ? <Badge variant="secondary" className="shrink-0 gap-1"><Check className="h-3 w-3" aria-hidden="true" />Em uso</Badge>
          : <Button type="button" variant="outline" size="sm" className="h-10 shrink-0" aria-label={`Usar versão ${translation} para leitura`} onClick={onSelect}>Ler</Button> : null}
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge variant={download.ready ? 'success' : download.active ? 'info' : download.download?.status === 'error' ? 'warning' : 'outline'} className="gap-1.5">
            {download.ready ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : <CloudDownload className="h-3.5 w-3.5" aria-hidden="true" />}{statusLabel}
          </Badge>
          {download.total > 0 ? <span className="text-xs tabular-nums text-muted-foreground">{download.completed.toLocaleString('pt-BR')} de {download.total.toLocaleString('pt-BR')} capítulos</span> : null}
        </div>
        {download.error ? <p role="alert" className="rounded-lg bg-warning-light p-3 text-xs leading-relaxed text-foreground [overflow-wrap:anywhere]">{download.error}</p> : null}
        {download.download?.status === 'paused' ? <p className="text-xs leading-relaxed text-muted-foreground">Seus capítulos estão salvos. Continue de onde parou.</p> : null}
        {!download.online ? <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><WifiOff className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />Conecte-se para baixar ou atualizar. Os capítulos já salvos continuam disponíveis.</p> : null}
      </div>

      <div className="space-y-2">
        <DownloadProgressButton
          state={state}
          progress={download.percentage}
          labels={{ idle: 'Baixar versão', ready: 'Disponível offline' }}
          aria-label={download.ready ? `${translation} disponível offline` : download.active ? `Baixando ${translation}: ${download.percentage}%` : state === 'paused' ? `Continuar download ${translation}` : state === 'error' ? `Tentar baixar ${translation} novamente` : `Baixar ${translation}`}
          disabled={download.loading || !download.online || download.busy || download.ready || hasConfirmation}
          onClick={() => void download.start()}
        />
        {download.total > 0 ? <Progress className="sr-only" value={download.percentage} aria-label={`Progresso do download ${translation}`} aria-valuetext={`${download.completed} de ${download.total} capítulos`} /> : null}
        {download.download ? <div className="flex flex-wrap items-center justify-between gap-2">
          {download.active ? <Button type="button" size="sm" variant="outline" className="h-10 gap-1.5" disabled={download.pausing} aria-label={`Pausar download ${translation}`} onClick={() => void download.pause()}><Pause className="h-4 w-4" aria-hidden="true" />{download.pausing ? 'Pausando…' : 'Pausar'}</Button>
            : download.ready ? <Button type="button" size="sm" variant="ghost" className="h-10 text-muted-foreground" disabled={!download.online || download.busy || hasConfirmation} aria-label={`Atualizar download ${translation}`} onClick={() => void download.start()}>Atualizar versão</Button> : null}
          <Button type="button" size="sm" variant="ghost" className="ml-auto h-10 gap-1.5 text-muted-foreground hover:text-destructive" disabled={download.active || download.busy} aria-label={`Remover ${translation} offline`} aria-expanded={hasConfirmation} aria-controls={confirmationId} onClick={() => setConfirmRemoval((current) => !current)}><Trash2 className="h-4 w-4" aria-hidden="true" />Remover</Button>
        </div> : null}
      </div>

      {hasConfirmation ? <div id={confirmationId} className="space-y-3 rounded-lg bg-muted/50 p-3">
        <p className="text-sm font-medium">Remover {translation} deste dispositivo?</p>
        <p className="text-xs leading-relaxed text-muted-foreground">Apenas a cópia para leitura offline será removida. Seus favoritos e anotações serão mantidos.</p>
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" className="h-10" disabled={download.removing} onClick={() => setConfirmRemoval(false)}>Cancelar</Button>
          <Button type="button" variant="destructive" className="h-10" disabled={download.busy} onClick={() => { void download.remove().then((removed) => { if (removed) setConfirmRemoval(false); }); }}>{download.removing ? 'Removendo…' : 'Confirmar remoção'}</Button>
        </div>
      </div> : null}
    </article>
  );
}
