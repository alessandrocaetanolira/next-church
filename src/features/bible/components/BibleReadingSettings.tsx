'use client';

import { Minus, Plus, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Switch } from '@/components/ui/switch';
import { BIBLE_FONT_SIZE_MAX, BIBLE_FONT_SIZE_MIN, useBibleReadingStore } from '@/features/bible/store';

/** Conteúdo reativo do drawer: assina o Zustand diretamente, sem snapshot da página. */
export function BibleReadingSettings() {
  const {
    fontSize,
    keepScreenAwake,
    wakeLockSupported,
    wakeLockActive,
    setFontSize,
    setKeepScreenAwake,
  } = useBibleReadingStore();

  const wakeLockDescription = wakeLockSupported === false
    ? 'Este navegador não oferece esse recurso.'
    : wakeLockActive
      ? 'Ativa durante a leitura neste dispositivo.'
      : 'Evita que a tela apague durante a leitura.';

  return (
    <>
      <DrawerHeader className="border-b text-left"><DrawerTitle>Preferências de leitura</DrawerTitle></DrawerHeader>
      <div className="space-y-6 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="space-y-3">
          <div>
            <p className="font-medium">Tamanho da fonte</p>
            <p className="text-sm text-muted-foreground">Ajuste para uma leitura mais confortável.</p>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/60 p-3">
            <Button type="button" variant="outline" size="icon" onClick={() => setFontSize(fontSize - 1)} disabled={fontSize <= BIBLE_FONT_SIZE_MIN} aria-label="Diminuir fonte"><Minus className="h-4 w-4" /></Button>
            <span className="min-w-20 text-center text-lg font-semibold" style={{ fontSize: `${fontSize}px` }}>Aa <span className="text-xs" style={{ fontSize: '12px' }}>{fontSize}px</span></span>
            <Button type="button" variant="outline" size="icon" onClick={() => setFontSize(fontSize + 1)} disabled={fontSize >= BIBLE_FONT_SIZE_MAX} aria-label="Aumentar fonte"><Plus className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-xl bg-muted/60 p-3">
          <div className="flex gap-3">
            <Sun className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div><p className="font-medium">Manter tela ligada</p><p className="text-sm text-muted-foreground">{wakeLockDescription}</p></div>
          </div>
          <Switch checked={wakeLockSupported === false ? false : keepScreenAwake} onCheckedChange={setKeepScreenAwake} disabled={wakeLockSupported === false} aria-label="Manter tela ligada" />
        </div>
      </div>
    </>
  );
}
