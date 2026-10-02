'use client';

import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

type FullscreenMediaViewerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src?: string | null;
  alt: string;
  kind?: 'cover' | 'avatar';
  actions?: ReactNode;
};

/** Visualizador fullscreen compartilhado para capas e avatares. */
export function FullscreenMediaViewer({ open, onOpenChange, src, alt, kind = 'cover', actions }: FullscreenMediaViewerProps) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="h-[100dvh] w-full max-w-none rounded-none border-0 bg-black p-0 text-white sm:rounded-none [&>button:last-child]:hidden"><DialogTitle className="sr-only">{alt}</DialogTitle><div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))]"><Button type="button" variant="ghost" size="icon" className="rounded-full bg-black/45 text-white hover:bg-black/70 hover:text-white" onClick={() => onOpenChange(false)} aria-label="Fechar imagem"><X className="h-5 w-5" /></Button>{actions}</div><div className="flex h-full w-full items-center justify-center p-4"><img src={src ?? ''} alt={alt} className={kind === 'cover' ? 'max-h-full w-full object-contain' : 'max-h-[70vh] max-w-[90vw] rounded-full object-contain'} /></div></DialogContent></Dialog>;
}
