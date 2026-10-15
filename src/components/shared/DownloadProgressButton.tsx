'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Check, Download, Loader2, Play, RotateCcw } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import styles from './DownloadProgressButton.module.css';

export type DownloadButtonState = 'idle' | 'preparing' | 'downloading' | 'paused' | 'ready' | 'error';
type DownloadProgressButtonProps = Omit<ButtonProps, 'children'> & {
  state: DownloadButtonState;
  progress?: number;
  labels?: Partial<Record<DownloadButtonState, string>>;
};
const DEFAULT_LABELS: Record<DownloadButtonState, string> = {
  idle: 'Baixar', preparing: 'Preparando…', downloading: 'Baixando', paused: 'Continuar', ready: 'Concluído', error: 'Tentar novamente',
};

/** Botão compartilhado inspirado no exemplo 33: progresso real, seta e check final.
 * Os únicos timers são de transição visual; nunca completam ou incrementam o download. */
export function DownloadProgressButton({ state, progress = 0, labels, className, style, disabled, ...props }: DownloadProgressButtonProps) {
  const [displayState, setDisplayState] = useState(state);
  const [phase, setPhase] = useState<'idle' | 'out' | 'in'>('idle');
  const previous = useRef(state);
  const percentage = Math.max(0, Math.min(100, Number.isFinite(progress) ? Math.round(progress) : 0));

  useEffect(() => {
    const justCompleted = state === 'ready' && (previous.current === 'downloading' || previous.current === 'preparing');
    previous.current = state;
    if (!justCompleted) { setDisplayState(state); setPhase('idle'); return; }
    setPhase('out');
    const enter = window.setTimeout(() => { setDisplayState('ready'); setPhase('in'); }, 230);
    const settle = window.setTimeout(() => setPhase('idle'), 950);
    return () => { window.clearTimeout(enter); window.clearTimeout(settle); };
  }, [state]);

  const Icon = displayState === 'ready' ? Check : displayState === 'preparing' ? Loader2
    : displayState === 'paused' ? Play : displayState === 'error' ? RotateCcw : Download;
  const active = state === 'preparing' || state === 'downloading';
  const label = labels?.[displayState] ?? DEFAULT_LABELS[displayState];
  return (
    <Button
      {...props}
      type={props.type ?? 'button'}
      disabled={disabled || active}
      aria-busy={active}
      data-state={displayState}
      data-phase={phase}
      className={cn(styles.root, 'h-12 w-full gap-2 rounded-[11px] px-3 text-sm font-semibold', className)}
      style={{ ...style, '--download-progress': `${state === 'ready' ? 100 : percentage}%` } as CSSProperties}
    >
      <span className={styles.fill} aria-hidden="true" />
      <span className={styles.icon} aria-hidden="true"><Icon className="h-5 w-5" /></span>
      <span className={styles.label}>{label}{displayState === 'downloading' ? ` · ${percentage}%` : ''}</span>
    </Button>
  );
}
