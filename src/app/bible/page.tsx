'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useUIStore } from '@/features/ui/store';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Share2, Bookmark, BookmarkCheck, Copy, List, X, ChevronDown, ChevronsUpDown, WifiOff, NotebookPen, ScrollText } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { hasActionPermission } from '@/lib/access-control';
import { useDrawer } from '@/components/providers/DrawerProvider';
import { getBibleBooks, getBibleChapter, getBibleChapters, type BibleBook, type BibleContentSource, type BibleTranslation } from '@/features/bible/api/bible.api';
import { BibleAnnotationForm } from '@/features/bible/components/BibleAnnotationForm';
import { BibleSavedItemsDrawer } from '@/features/bible/components/BibleSavedItemsDrawer';
import { BibleDownloadControl } from '@/features/bible/components/BibleDownloadControl';
import type { BibleAnnotation, BibleFavorite } from '@/lib/db';

export default function BiblePage() {
  const { data: session } = useSession();
  const user = session?.user;
  const userEmail = user?.email;
  const canShareToFeed = hasActionPermission(user, 'feed', 'share');
  const setPageTitle = useUIStore((state) => state.setPageTitle);
  const { openDrawer, closeDrawer } = useDrawer();

  const [books, setBooks] = useState<BibleBook[]>([]);
  const [translation, setTranslation] = useState<BibleTranslation>('NVI');
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null);
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [verses, setVerses] = useState<string[]>([]);
  const [availableChapters, setAvailableChapters] = useState<number[]>([]);
  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);
  const [bookListOpen, setBookListOpen] = useState(false);
  const [expandedBook, setExpandedBook] = useState<string | null>(null);
  const [chaptersByBook, setChaptersByBook] = useState<Record<string, number[]>>({});
  const [contentSource, setContentSource] = useState<BibleContentSource>('network');
  const bibleReaderRef = useRef<HTMLDivElement>(null);

  const toggleVerse = (index: number) => {
    setSelectedVerses(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index].sort((a,b) => a - b)
    );
  };

  async function fetchBooks() {
    try {
      const result = await getBibleBooks(translation);
      setBooks(result.data);
      setContentSource(result.source);
      if (result.data.length > 0) setSelectedBook(result.data[0]);
    } catch {
      toast.error('Erro ao carregar livros');
    }
  }

  async function fetchAvailableChapters(book: string) {
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
  }

  async function loadChapterData(book: string, chapter: number) {
    try {
      const result = await getBibleChapter(book, chapter, translation);
      setVerses(result.data.verses);
      setContentSource(result.source);
    } catch {
      setVerses([]);
      toast.error('Erro ao carregar versículos.');
    }
  }

  useEffect(() => {
    setPageTitle('Bíblia');
    fetchBooks();
  }, [setPageTitle, translation]);

  useEffect(() => {
    if (selectedBook) {
      fetchAvailableChapters(selectedBook.abbrev);
      loadChapterData(selectedBook.abbrev, selectedChapter);
    }
  }, [selectedBook, selectedChapter, translation]);

  useEffect(() => {
    const viewport = bibleReaderRef.current?.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]');
    viewport?.scrollTo({ top: 0, behavior: 'auto' });
  }, [selectedBook?.abbrev, selectedChapter, translation]);

  const favorites = useLiveQuery(() =>
    userEmail ? db.bibleFavorites.where('userId').equals(userEmail).toArray() : [],
    [userEmail]
  );
  const annotations = useLiveQuery(() =>
    userEmail ? db.bibleAnnotations.where('userId').equals(userEmail).toArray() : [],
    [userEmail]
  );

  const selectedVerseNumbers = useMemo(() => selectedVerses.map((verse) => verse + 1), [selectedVerses]);
  const selectionKey = useMemo(() => selectedVerseNumbers.join(','), [selectedVerseNumbers]);
  const favorite = favorites?.find((item) => item.translation === translation && item.bookAbbrev === selectedBook?.abbrev && item.chapter === selectedChapter && item.selectionKey === selectionKey);

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
  }, [favorite, selectedBook, selectedChapter, selectedVerseNumbers, selectionKey, translation, userEmail]);

  const shareToFeed = useCallback(async () => {
    if (!userEmail || selectedVerses.length === 0 || !selectedBook) return;
    const verseText = selectedVerses.map(i => verses[i]).join(' ');
    const response = await fetch('/api/feed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'verse',
        share: true,
        content: verseText,
        reference: `${selectedBook.name} ${selectedChapter}:${selectedVerses.map(v => v + 1).join(',')}`,
      }),
    });

    if (!response.ok) {
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
      contentClassName: 'max-h-[70dvh]',
      content: <BibleAnnotationForm reference={reference} onCancel={closeDrawer} onSave={async (note) => {
        const now = new Date().toISOString();
        await db.bibleAnnotations.add({
          userId,
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
        setSelectedVerses([]);
        closeDrawer();
      }} />,
    });
  }, [closeDrawer, openDrawer, selectedBook, selectedChapter, selectedVerseNumbers, selectionKey, translation, userEmail]);

  const openSavedItemsDrawer = useCallback(() => {
    if (!userEmail) {
      toast.error('Faça login para acessar os itens salvos.');
      return;
    }
    openDrawer({
      contentClassName: 'max-h-[70dvh]',
      content: <BibleSavedItemsDrawer userId={userEmail} onSelect={(item: BibleFavorite | BibleAnnotation) => {
        setTranslation(item.translation);
        setSelectedBook({ abbrev: item.bookAbbrev, name: item.bookName, testament: item.testament, position: 0, translation: item.translation });
        setSelectedChapter(item.chapter);
        setSelectedVerses(item.verseNumbers.map((verse) => verse - 1));
        closeDrawer();
      }} />,
    });
  }, [closeDrawer, openDrawer, userEmail]);

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
            <Button type="button" variant="outline" className="justify-start gap-2" onClick={openAnnotationDrawer}>
              <NotebookPen className="h-4 w-4" /> Adicionar anotação
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
  }, [canShareToFeed, clearVerseSelection, closeDrawer, copySelectedVerses, favorite, openAnnotationDrawer, openDrawer, selectedBook, selectedChapter, selectedVerses, shareToFeed, toggleFavorite, translation, verses]);

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
  }, [closeDrawer, openDrawer, translation]);

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
  }, [availableChapters, closeDrawer, openDrawer, selectedChapter]);

  const selectBook = (book: BibleBook) => {
    setSelectedBook(book);
    setSelectedChapter(1);
    setSelectedVerses([]);
    setBookListOpen(false);
    setSearchTerm('');
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
    setSelectedChapter(chapter);
    setSelectedVerses([]);
    setBookListOpen(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const regex = /([a-zA-Z\s]+)\s+(\d+)(?::(\d+))?/;
    const match = searchTerm.match(regex);
    if (match) {
      const [_, bookName, chapter, verse] = match;
      const foundBook = books.find(b => b.name.toLowerCase().includes(bookName.toLowerCase().trim()));
      if (foundBook) {
        selectBook(foundBook);
        setSelectedChapter(parseInt(chapter));
        if (verse) setTimeout(() => setSelectedVerses([parseInt(verse) - 1]), 500);
      }
    }
  };

  const filteredBooks = searchTerm ? books.filter(b => b.name.toLowerCase().includes(searchTerm.toLowerCase())) : books;
  const otBooks = filteredBooks.filter(b => b.testament === 'AT');
  const ntBooks = filteredBooks.filter(b => b.testament === 'NT');

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem-4rem)] md:h-[calc(100vh-4rem)]">
      {/* Top Navigation Bar */}
      <div className="bg-card border-b border-border px-4 py-3 space-y-2">
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" className="w-[78px] justify-between bg-background px-2" onClick={openTranslationDrawer}>
            {translation}<ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
          {/* Seletor de Livro */}
          <Drawer open={bookListOpen} onOpenChange={setBookListOpen}>
            <DrawerTrigger asChild>
              <Button variant="outline" className="flex-[2] justify-start gap-2 font-semibold bg-background">
                <List className="w-4 h-4" />
                {selectedBook?.name || 'Selecione...'}
              </Button>
            </DrawerTrigger>
            <DrawerContent className="max-h-[82dvh]">
              <DrawerHeader className="border-b text-left"><DrawerTitle>Livros da Bíblia</DrawerTitle></DrawerHeader>
              <ScrollArea className="h-[calc(82dvh-6.5rem)] px-4 pb-6">
                {[
                  ['Antigo Testamento', otBooks],
                  ['Novo Testamento', ntBooks],
                ].map(([title, testamentBooks], index) => (
                  <div key={title as string}>
                    {index > 0 && <Separator />}
                    <section className="py-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title as string}</p>
                      <div className="divide-y divide-border rounded-lg border border-border">
                        {(testamentBooks as BibleBook[]).map((book) => {
                          const isExpanded = expandedBook === book.abbrev;
                          const chapters = chaptersByBook[book.abbrev] ?? [];
                          return <div key={`${translation}-${book.abbrev}`}>
                            <button type="button" onClick={() => toggleBook(book)} className="flex w-full items-center justify-between px-3 py-3 text-left text-sm font-medium">
                              <span className={cn(book.abbrev === selectedBook?.abbrev ? 'text-primary' : 'text-foreground')}>{book.name}</span>
                              <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', isExpanded && 'rotate-180')} />
                            </button>
                            {isExpanded && <div className="grid grid-cols-6 gap-2 border-t border-border bg-muted/40 p-3">
                              {chapters.map((chapter) => <Button key={`${book.abbrev}-${chapter}`} type="button" variant={book.abbrev === selectedBook?.abbrev && chapter === selectedChapter ? 'default' : 'outline'} size="sm" className="h-9 px-0" onClick={() => selectChapterFromDrawer(book, chapter)}>{chapter}</Button>)}
                            </div>}
                          </div>;
                        })}
                      </div>
                    </section>
                  </div>
                ))}
              </ScrollArea>
            </DrawerContent>
          </Drawer>

          <Button type="button" variant="outline" className="w-[100px] justify-between bg-background px-2" onClick={openChapterDrawer}>
            Cap {selectedChapter}<ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>

          <Button size="icon" variant="ghost" onClick={openSavedItemsDrawer} aria-label="Itens salvos">
            <BookmarkCheck className="w-5 h-5" />
          </Button>
        </div>
        {contentSource === 'cache' && <p className="flex items-center gap-1 text-xs text-muted-foreground"><WifiOff className="h-3.5 w-3.5" /> Conteúdo salvo no dispositivo</p>}
      </div>

      <ScrollArea ref={bibleReaderRef} className="flex-1 bg-background/50">
        <div className="max-w-2xl mx-auto px-5 py-8 pb-32">
          {verses.map((v, i) => (
            (() => {
              const marker = getVerseMarker(i);
              const markerBackground = marker.isFavorite && marker.hasAnnotation
                ? 'bg-amber-500/15 ring-1 ring-inset ring-violet-500/40'
                : marker.isFavorite
                  ? 'bg-amber-500/15'
                  : marker.hasAnnotation
                    ? 'bg-violet-500/15'
                    : '';
              return <p key={i} className={cn('flex items-start gap-2 text-[17px] leading-8 py-1 px-3 rounded-lg cursor-pointer', selectedVerses.includes(i) ? 'bg-primary/20 text-foreground font-medium' : cn(markerBackground, 'hover:bg-muted/50'))}
              onClick={() => toggleVerse(i)}>
                <span className="shrink-0"><sup className="text-[10px] font-bold text-primary/60">{i + 1}</sup></span>
                <span className="min-w-0 flex-1">{v}</span>
                {(marker.isFavorite || marker.hasAnnotation) && <span className="flex shrink-0 items-center gap-1 pt-1 text-muted-foreground" aria-label={[marker.isFavorite && 'Favorito', marker.hasAnnotation && 'Com anotação'].filter(Boolean).join(' e ')}>
                  {marker.hasAnnotation && <ScrollText className="h-4 w-4 text-violet-600" />}
                  {marker.isFavorite && <BookmarkCheck className="h-4 w-4 text-amber-600" />}
                </span>}
              </p>;
            })()
          ))}
        </div>
      </ScrollArea>

    </div>
  );
}
