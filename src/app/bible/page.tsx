'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { useUIStore } from '@/features/ui/store';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Share2, Bookmark, BookmarkCheck, Copy, X, NotebookPen, ScrollText, Minus, Plus, Sun } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { hasActionPermission } from '@/lib/access-control';
import { useDrawer } from '@/components/providers/DrawerProvider';
import { getBibleBooks, getBibleChapter, getBibleChapters, type BibleBook, type BibleContentSource, type BibleTranslation } from '@/features/bible/api/bible.api';
import { BibleAnnotationForm } from '@/features/bible/components/BibleAnnotationForm';
import { BibleSavedItemsDrawer } from '@/features/bible/components/BibleSavedItemsDrawer';
import { BibleDownloadControl } from '@/features/bible/components/BibleDownloadControl';
import type { BibleAnnotation, BibleFavorite } from '@/lib/db';
import { createFeedPost } from '@/services/feed/feed-api';
import { BibleWebNavigation } from '@/features/bible/components/BibleWebNavigation';
import { useBibleReadingStore } from '@/features/bible/store';

type ScreenWakeLockSentinel = {
  release: () => Promise<void>;
  addEventListener: (type: 'release', listener: () => void) => void;
};

type NavigatorWithWakeLock = Navigator & {
  wakeLock?: { request: (type: 'screen') => Promise<ScreenWakeLockSentinel> };
};

export default function BiblePage() {
  const { data: session } = useSession();
  const user = session?.user;
  const userEmail = user?.email;
  const tenantId = user?.tenantId ?? '';
  const searchParams = useSearchParams();
  const requestedBook = searchParams.get('book');
  const requestedChapter = Number(searchParams.get('chapter'));
  const requestedVerse = Number(searchParams.get('verse'));
  const canShareToFeed = hasActionPermission(user, 'feed', 'share');
  const setPageTitle = useUIStore((state) => state.setPageTitle);
  const { tenantId: storedTenantId, translation, bookAbbrev, chapter: selectedChapter, fontSize, keepScreenAwake, setTenant, setTranslation, setBook, setChapter: setSelectedChapter, setFontSize, setKeepScreenAwake } = useBibleReadingStore();
  const { openDrawer, closeDrawer } = useDrawer();

  const [books, setBooks] = useState<BibleBook[]>([]);
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null);
  const [verses, setVerses] = useState<string[]>([]);
  const [availableChapters, setAvailableChapters] = useState<number[]>([]);
  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);
  const [bookListOpen, setBookListOpen] = useState(false);
  const [expandedBook, setExpandedBook] = useState<string | null>(null);
  const [chaptersByBook, setChaptersByBook] = useState<Record<string, number[]>>({});
  const [contentSource, setContentSource] = useState<BibleContentSource>('network');
  const bibleReaderRef = useRef<HTMLDivElement>(null);
  const wakeLockRef = useRef<ScreenWakeLockSentinel | null>(null);

  const toggleVerse = (index: number) => {
    setSelectedVerses(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index].sort((a,b) => a - b)
    );
  };

  const fetchBooks = useCallback(async () => {
    try {
      const result = await getBibleBooks(translation);
      setBooks(result.data);
      setContentSource(result.source);
      if (result.data.length > 0) {
        const preferredBook = result.data.find((book) => book.abbrev === bookAbbrev) ?? result.data[0];
        setSelectedBook(preferredBook);
        if (preferredBook.abbrev !== bookAbbrev) setBook(preferredBook.abbrev);
      }
    } catch {
      toast.error('Erro ao carregar livros');
    }
  }, [bookAbbrev, setBook, translation]);

  const fetchAvailableChapters = useCallback(async (book: string) => {
    try {
      const result = await getBibleChapters(book, translation);
      const chapters = result.data;
      setContentSource(result.source);
      setChaptersByBook((current) => ({ ...current, [book]: chapters }));
      setAvailableChapters(chapters);
      if (!chapters.includes(selectedChapter)) {
          setSelectedChapter(chapters[0] || 1);
      }
    } catch {
      toast.error('Erro ao carregar capítulos');
    }
  }, [selectedChapter, setSelectedChapter, translation]);

  const loadChapterData = useCallback(async (book: string, chapter: number) => {
    try {
      const result = await getBibleChapter(book, chapter, translation);
      setVerses(result.data.verses);
      setContentSource(result.source);
    } catch {
      setVerses([]);
      toast.error('Erro ao carregar versículos.');
    }
  }, [translation]);

  useEffect(() => {
    if (tenantId && storedTenantId !== tenantId) setTenant(tenantId);
  }, [setTenant, storedTenantId, tenantId]);

  useEffect(() => {
    setPageTitle('Bíblia');
    fetchBooks();
  }, [fetchBooks, setPageTitle]);

  useEffect(() => {
    if (!requestedBook || !books.length) return;
    const targetBook = books.find((book) => book.abbrev === requestedBook);
    if (!targetBook) return;
    setSelectedBook(targetBook);
    setBook(targetBook.abbrev);
    if (Number.isInteger(requestedChapter) && requestedChapter > 0) setSelectedChapter(requestedChapter);
    if (Number.isInteger(requestedVerse) && requestedVerse > 0) setSelectedVerses([requestedVerse - 1]);
  }, [books, requestedBook, requestedChapter, requestedVerse, setBook, setSelectedChapter]);

  useEffect(() => {
    if (selectedBook) {
      fetchAvailableChapters(selectedBook.abbrev);
      loadChapterData(selectedBook.abbrev, selectedChapter);
    }
  }, [fetchAvailableChapters, loadChapterData, selectedBook, selectedChapter]);

  useEffect(() => {
    const viewport = bibleReaderRef.current?.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]');
    viewport?.scrollTo({ top: 0, behavior: 'auto' });
  }, [selectedBook?.abbrev, selectedChapter, translation]);

  useEffect(() => {
    const release = async () => {
      const sentinel = wakeLockRef.current;
      wakeLockRef.current = null;
      if (sentinel) await sentinel.release().catch(() => undefined);
    };

    const request = async () => {
      if (!keepScreenAwake || document.visibilityState !== 'visible') return;
      const wakeLock = (navigator as NavigatorWithWakeLock).wakeLock;
      if (!wakeLock || wakeLockRef.current) return;
      try {
        const sentinel = await wakeLock.request('screen');
        wakeLockRef.current = sentinel;
        sentinel.addEventListener('release', () => {
          if (wakeLockRef.current === sentinel) wakeLockRef.current = null;
        });
      } catch {
        // Alguns navegadores ou modos de economia de energia não oferecem Wake Lock.
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') void request();
      else void release();
    };

    void request();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      void release();
    };
  }, [keepScreenAwake]);

  const favorites = useLiveQuery(() =>
    userEmail && tenantId ? db.bibleFavorites.filter((item) => item.userId === userEmail && item.tenantId === tenantId).toArray() : [],
    [userEmail, tenantId]
  );
  const annotations = useLiveQuery(() =>
    userEmail && tenantId ? db.bibleAnnotations.filter((item) => item.userId === userEmail && item.tenantId === tenantId).toArray() : [],
    [userEmail, tenantId]
  );

  const selectedVerseNumbers = useMemo(() => selectedVerses.map((verse) => verse + 1), [selectedVerses]);
  const selectionKey = useMemo(() => selectedVerseNumbers.join(','), [selectedVerseNumbers]);
  const favorite = favorites?.find((item) => item.translation === translation && item.bookAbbrev === selectedBook?.abbrev && item.chapter === selectedChapter && item.selectionKey === selectionKey);
  const annotation = annotations?.find((item) => item.translation === translation && item.bookAbbrev === selectedBook?.abbrev && item.chapter === selectedChapter && item.selectionKey === selectionKey);

  const getVerseMarker = useCallback((verseIndex: number) => {
    const verseNumber = verseIndex + 1;
    const matches = (item: { translation: BibleTranslation; bookAbbrev: string; chapter: number; verseNumbers: number[] }) =>
      item.translation === translation && item.bookAbbrev === selectedBook?.abbrev && item.chapter === selectedChapter && item.verseNumbers.includes(verseNumber);

    return {
      isFavorite: favorites?.some(matches) ?? false,
      hasAnnotation: annotations?.some(matches) ?? false,
    };
  }, [annotations, favorites, selectedBook?.abbrev, selectedChapter, translation]);

  const toggleFavorite = useCallback(async () => {
    if (!userEmail || !selectedBook || selectedVerseNumbers.length === 0) return;
    if (favorite) {
      await db.bibleFavorites.delete(favorite.id!);
      toast.info('Favorito removido');
    } else {
      await db.bibleFavorites.add({
        userId: userEmail,
        tenantId,
        translation,
        bookAbbrev: selectedBook.abbrev,
        bookName: selectedBook.name,
        testament: selectedBook.testament,
        chapter: selectedChapter,
        verseNumbers: selectedVerseNumbers,
        selectionKey,
        createdAt: new Date().toISOString(),
      });
      toast.success('Versículos marcados como favoritos!');
    }
  }, [favorite, selectedBook, selectedChapter, selectedVerseNumbers, selectionKey, tenantId, translation, userEmail]);

  const shareToFeed = useCallback(async () => {
    if (!userEmail || selectedVerses.length === 0 || !selectedBook) return;
    const verseText = selectedVerses.map(i => verses[i]).join(' ');
    try {
      await createFeedPost({
        type: 'verse',
        share: true,
        content: verseText,
        reference: `${selectedBook.name} ${selectedChapter}:${selectedVerses.map(v => v + 1).join(',')}`,
      });
    } catch {
      toast.error('Não foi possível compartilhar os versículos.');
      return;
    }

    toast.success('Versículos compartilhados!');
    setSelectedVerses([]);
    closeDrawer();
  }, [closeDrawer, selectedBook, selectedChapter, selectedVerses, userEmail, verses]);

  const clearVerseSelection = useCallback(() => {
    setSelectedVerses([]);
    closeDrawer();
  }, [closeDrawer]);

  const openAnnotationDrawer = useCallback(() => {
    if (!userEmail || !selectedBook || selectedVerseNumbers.length === 0) return;
    const userId = userEmail;
    const reference = `${selectedBook.name} ${selectedChapter}:${selectedVerseNumbers.join(', ')} · ${translation}`;
    openDrawer({
      contentClassName: 'max-h-[82dvh] rounded-t-[28px] overscroll-contain',
      content: <BibleAnnotationForm reference={reference} initialNote={annotation?.note} title={annotation ? 'Editar anotação' : 'Nova anotação'} onCancel={closeDrawer} onSave={async (note) => {
        const now = new Date().toISOString();
        if (annotation?.id) {
          await db.bibleAnnotations.update(annotation.id, { note, updatedAt: now });
          toast.success('Anotação atualizada!');
        } else {
          await db.bibleAnnotations.add({
            userId,
            tenantId,
            translation,
            bookAbbrev: selectedBook.abbrev,
            bookName: selectedBook.name,
            testament: selectedBook.testament,
            chapter: selectedChapter,
            verseNumbers: selectedVerseNumbers,
            selectionKey,
            note,
            createdAt: now,
            updatedAt: now,
          });
          toast.success('Anotação salva!');
        }
        setSelectedVerses([]);
        closeDrawer();
      }} />,
    });
  }, [annotation, closeDrawer, openDrawer, selectedBook, selectedChapter, selectedVerseNumbers, selectionKey, tenantId, translation, userEmail]);

  const openSavedItemsDrawer = useCallback(() => {
    if (!userEmail) {
      toast.error('Faça login para acessar os itens salvos.');
      return;
    }
    openDrawer({
      contentClassName: 'max-h-[70dvh]',
      content: <BibleSavedItemsDrawer userId={userEmail} tenantId={tenantId} onSelect={(item: BibleFavorite | BibleAnnotation) => {
        setTranslation(item.translation);
        setSelectedBook({ abbrev: item.bookAbbrev, name: item.bookName, testament: item.testament, position: 0, translation: item.translation });
        setSelectedChapter(item.chapter);
        setSelectedVerses(item.verseNumbers.map((verse) => verse - 1));
        closeDrawer();
      }} />,
    });
  }, [closeDrawer, openDrawer, setSelectedChapter, setTranslation, tenantId, userEmail]);

  const copySelectedVerses = useCallback(async () => {
    if (!selectedBook || selectedVerses.length === 0) return;
    const reference = `${selectedBook.name} ${selectedChapter}:${selectedVerses.map((verse) => verse + 1).join(', ')} (${translation})`;
    const text = `${selectedVerses.map((verse) => verses[verse]).join(' ')}\n\n${reference}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Versículos copiados!');
    } catch {
      toast.error('Não foi possível copiar os versículos.');
    }
  }, [selectedBook, selectedChapter, selectedVerses, translation, verses]);

  useEffect(() => {
    if (!selectedBook || selectedVerses.length === 0) {
      closeDrawer();
      return;
    }

    const reference = `${selectedBook.name} ${selectedChapter}:${selectedVerses.map((verse) => verse + 1).join(', ')}`;
    const selectedText = selectedVerses.map((verse) => verses[verse]).join(' ');
    openDrawer({
      contentClassName: 'max-h-[70dvh]',
      content: <>
        <DrawerHeader className="border-b text-left">
          <DrawerTitle>Ações do versículo</DrawerTitle>
          <p className="text-sm font-medium text-primary">{reference} · {translation}</p>
        </DrawerHeader>
        <div className="space-y-4 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <p className="max-h-28 overflow-y-auto rounded-lg bg-muted p-3 text-sm leading-6 text-muted-foreground">{selectedText}</p>
          <div className="grid gap-2">
            <Button type="button" variant={favorite ? 'secondary' : 'outline'} className="justify-start gap-2" onClick={toggleFavorite}>
              {favorite ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />} {favorite ? 'Remover dos favoritos' : 'Marcar como favorito'}
            </Button>
            <Button type="button" variant={annotation ? 'secondary' : 'outline'} className="justify-start gap-2" onClick={openAnnotationDrawer}>
              <NotebookPen className="h-4 w-4" /> {annotation ? 'Ver/editar anotação' : 'Adicionar anotação'}
            </Button>
            <Button type="button" variant="outline" className="justify-start gap-2" onClick={copySelectedVerses}>
              <Copy className="h-4 w-4" /> Copiar versículo
            </Button>
            {canShareToFeed && <Button type="button" className="justify-start gap-2" onClick={shareToFeed}>
              <Share2 className="h-4 w-4" /> Compartilhar no feed
            </Button>}
            <Button type="button" variant="ghost" className="justify-start gap-2" onClick={clearVerseSelection}>
              <X className="h-4 w-4" /> Limpar seleção
            </Button>
          </div>
        </div>
      </>,
    });
  }, [annotation, canShareToFeed, clearVerseSelection, closeDrawer, copySelectedVerses, favorite, openAnnotationDrawer, openDrawer, selectedBook, selectedChapter, selectedVerses, shareToFeed, toggleFavorite, translation, verses]);

  const openTranslationDrawer = useCallback(() => {
    openDrawer({
      content: <>
        <DrawerHeader className="border-b text-left"><DrawerTitle>Versão da Bíblia</DrawerTitle></DrawerHeader>
          <div className="grid gap-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {[
              ['NVI', 'Nova Versão Internacional'],
              ['ACF', 'Almeida Corrigida Fiel'],
              ['AA', 'Almeida Atualizada'],
            ].map(([code, name]) => (
              <div key={code} className="space-y-2">
                <Button type="button" variant={translation === code ? 'default' : 'outline'} className="h-auto w-full justify-start py-3 text-left" onClick={() => {
                  setTranslation(code as BibleTranslation);
                  setChaptersByBook({});
                  setSelectedVerses([]);
                  closeDrawer();
                }}>
                  <span className="font-semibold">{code}</span><span className="ml-2 text-xs opacity-80">{name}</span>
                </Button>
                <BibleDownloadControl translation={code as BibleTranslation} />
              </div>
            ))}
        </div>
      </>,
    });
  }, [closeDrawer, openDrawer, setTranslation, translation]);

  const openChapterDrawer = useCallback(() => {
    const chapters = availableChapters.length > 0 ? Array.from(new Set(availableChapters)) : [1];
    openDrawer({
      contentClassName: 'max-h-[75dvh]',
      content: <>
        <DrawerHeader className="border-b text-left"><DrawerTitle>Escolha o capítulo</DrawerTitle></DrawerHeader>
        <ScrollArea className="h-[calc(75dvh-6rem)] p-4 pb-6">
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-8">
            {chapters.map((chapter) => <Button key={chapter} type="button" variant={chapter === selectedChapter ? 'default' : 'outline'} className="h-11" onClick={() => {
              setSelectedChapter(chapter);
              setSelectedVerses([]);
              closeDrawer();
            }}>{chapter}</Button>)}
          </div>
        </ScrollArea>
      </>,
    });
  }, [availableChapters, closeDrawer, openDrawer, selectedChapter, setSelectedChapter]);

  const openReadingSettings = useCallback(() => {
    openDrawer({
      content: <>
        <DrawerHeader className="border-b text-left"><DrawerTitle>Preferências de leitura</DrawerTitle></DrawerHeader>
        <div className="space-y-6 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="space-y-3">
            <div>
              <p className="font-medium">Tamanho da fonte</p>
              <p className="text-sm text-muted-foreground">Ajuste para uma leitura mais confortável.</p>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/60 p-3">
              <Button type="button" variant="outline" size="icon" onClick={() => setFontSize(fontSize - 1)} disabled={fontSize <= 15} aria-label="Diminuir fonte"><Minus className="h-4 w-4" /></Button>
              <span className="min-w-20 text-center text-lg font-semibold" style={{ fontSize: `${fontSize}px` }}>Aa</span>
              <Button type="button" variant="outline" size="icon" onClick={() => setFontSize(fontSize + 1)} disabled={fontSize >= 26} aria-label="Aumentar fonte"><Plus className="h-4 w-4" /></Button>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-xl bg-muted/60 p-3">
            <div className="flex gap-3">
              <Sun className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div><p className="font-medium">Manter tela ligada</p><p className="text-sm text-muted-foreground">Evita que a tela apague durante a leitura.</p></div>
            </div>
            <Switch checked={keepScreenAwake} onCheckedChange={setKeepScreenAwake} aria-label="Manter tela ligada" />
          </div>
        </div>
      </>,
    });
  }, [fontSize, keepScreenAwake, openDrawer, setFontSize, setKeepScreenAwake]);

  const selectBook = (book: BibleBook) => {
    setSelectedBook(book);
    setBook(book.abbrev);
    setSelectedChapter(1);
    setSelectedVerses([]);
    setBookListOpen(false);
  };

  const toggleBook = async (book: BibleBook) => {
    if (expandedBook === book.abbrev) {
      setExpandedBook(null);
      return;
    }
    setExpandedBook(book.abbrev);
    if (!chaptersByBook[book.abbrev]) await fetchAvailableChapters(book.abbrev);
  };

  const selectChapterFromDrawer = (book: BibleBook, chapter: number) => {
    setSelectedBook(book);
    setBook(book.abbrev);
    setSelectedChapter(chapter);
    setSelectedVerses([]);
    setBookListOpen(false);
  };

  return (
    <div className="flex h-[calc(100dvh-4rem)] min-h-0 flex-col md:h-[calc(100dvh-4rem)]">
      <BibleWebNavigation translation={translation} selectedBook={selectedBook} selectedChapter={selectedChapter} contentSource={contentSource} books={books} chaptersByBook={chaptersByBook} expandedBook={expandedBook} bookListOpen={bookListOpen} onBookListOpenChange={setBookListOpen} onToggleBook={(book) => void toggleBook(book)} onSelectChapter={selectChapterFromDrawer} onOpenTranslation={openTranslationDrawer} onOpenChapter={openChapterDrawer} onOpenSavedItems={openSavedItemsDrawer} onOpenReadingSettings={openReadingSettings} />

      <ScrollArea ref={bibleReaderRef} className="flex-1 bg-background/50">
        <div className="max-w-2xl mx-auto px-5 py-8 pb-32">
          {verses.map((v, i) => (
            (() => {
              const marker = getVerseMarker(i);
              const markerBackground = marker.isFavorite && marker.hasAnnotation
                ? 'bg-warning/15 ring-1 ring-inset ring-primary/40'
                : marker.isFavorite
                  ? 'bg-warning/15'
                  : marker.hasAnnotation
                    ? 'bg-violet-500/15'
                    : '';
              return <p key={i} className={cn('flex items-start gap-2 rounded-lg px-3 py-1 cursor-pointer', selectedVerses.includes(i) ? 'bg-primary/20 text-foreground font-medium' : cn(markerBackground, 'hover:bg-muted/50'))}
              style={{ fontSize: `${fontSize}px`, lineHeight: 1.9 }}
              onClick={() => toggleVerse(i)}>
                <span className="shrink-0"><sup className="text-[10px] font-bold text-primary/60">{i + 1}</sup></span>
                <span className="min-w-0 flex-1">{v}</span>
                {(marker.isFavorite || marker.hasAnnotation) && <span className="flex shrink-0 items-center gap-1 pt-1 text-muted-foreground" aria-label={[marker.isFavorite && 'Favorito', marker.hasAnnotation && 'Com anotação'].filter(Boolean).join(' e ')}>
                  {marker.hasAnnotation && <ScrollText className="h-4 w-4 text-violet-600" />}
                  {marker.isFavorite && <BookmarkCheck className="h-4 w-4 text-warning" />}
                </span>}
              </p>;
            })()
          ))}
        </div>
      </ScrollArea>

    </div>
  );
}
