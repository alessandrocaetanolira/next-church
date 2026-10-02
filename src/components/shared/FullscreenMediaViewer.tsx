'use client';

import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { AppImage } from '@/components/shared/AppImage';

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
  useEffect(() => {
    const viewport = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    if (!viewport || !open) return;

    const previousContent = viewport.content;
    viewport.content = previousContent
      .replace(/maximum-scale=[^,]+,?/i, '')
      .replace(/user-scalable=[^,]+,?/i, '')
      .replace(/,,+/g, ',')
      .replace(/,$/, '') + ', maximum-scale=5, user-scalable=yes';

    return () => {
      viewport.content = previousContent;
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed inset-0 flex h-[100dvh] max-h-[100dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-black p-0 text-white sm:rounded-none [&>button:last-child]:hidden">
        <DialogTitle className="sr-only">{alt}</DialogTitle>
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
          <Button type="button" variant="ghost" size="icon" className="rounded-full bg-black/45 text-white hover:bg-black/70 hover:text-white" onClick={() => onOpenChange(false)} aria-label="Fechar imagem">
            <X className="h-5 w-5" />
          </Button>
          {actions}
        </div>
        <div className="allow-pinch-zoom flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[calc(4.5rem+env(safe-area-inset-top))]">
          {src ? (
            <AppImage
              src={src}
              alt={alt}
              draggable={false}
              className={kind === 'cover'
                ? 'block h-auto max-h-full max-w-full object-contain select-none'
                : 'block h-auto max-h-[min(70dvh,100%)] max-w-[min(90vw,24rem)] rounded-full object-contain select-none'}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
