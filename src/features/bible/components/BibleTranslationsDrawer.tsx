'use client';

import { BookOpen, CheckCircle2 } from 'lucide-react';
import { DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useBibleReadingStore } from '../store';
import type { BibleTranslation } from '../api/bible.api';
import { BIBLE_TRANSLATIONS } from '../lib/translations';
import { BibleDownloadControl } from './BibleDownloadControl';

/** Seleção assina o Zustand; progresso de cada versão assina o Dexie diretamente. */
export function BibleTranslationsDrawer({ onSelect }: { onSelect: (translation: BibleTranslation) => void }) {
  const selected = useBibleReadingStore((state) => state.translation);
  return (
    <div className="mx-auto w-full max-w-lg">
      <DrawerHeader className="sticky top-0 z-10 border-b border-border/50 bg-background text-left">
        <DrawerTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5 shrink-0" aria-hidden="true" />Versões da Bíblia</DrawerTitle>
        <DrawerDescription>Escolha sua versão para ler ou baixe para usar sem internet.</DrawerDescription>
      </DrawerHeader>
      <div className="space-y-3 p-4">
        <p className="flex items-start gap-2 rounded-xl bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />O download é opcional e fica salvo somente neste dispositivo.</p>
        {BIBLE_TRANSLATIONS.map(({ code }) => <BibleDownloadControl key={code} translation={code} selected={selected === code} onSelect={() => onSelect(code)} />)}
      </div>
    </div>
  );
}
