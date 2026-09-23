'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useUIStore } from '@/features/ui/store';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Share2, Bookmark, BookmarkCheck, Copy, List, X, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { hasActionPermission } from '@/lib/access-control';
import { useDrawer } from '@/components/providers/DrawerProvider';

export default function BiblePage() {
  const { data: session } = useSession();
  const user = session?.user;
  const canShareToFeed = hasActionPermission(user, 'feed', 'share');
  const setPageTitle = useUIStore((state) => state.setPageTitle);
  const { openDrawer, closeDrawer } = useDrawer();

  const [books, setBooks] = useState<any[]>([]);
  const [translation, setTranslation] = useState('NVI');
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [verses, setVerses] = useState<string[]>([]);
  const [availableChapters, setAvailableChapters] = useState<number[]>([]);
  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);
  const [bookListOpen, setBookListOpen] = useState(false);
  const [expandedBook, setExpandedBook] = useState<string | null>(null);
  const [chaptersByBook, setChaptersByBook] = useState<Record<string, number[]>>({});

  const toggleVerse = (index: number) => {
    setSelectedVerses(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index].sort((a,b) => a - b)
    );
  };

  useEffect(() => {
    setPageTitle('Bíblia');
    fetchBooks();
  }, [setPageTitle, translation]);

  const fetchBooks = async () => {
    try {
      const res = await fetch(`/api/bible/books?translation=${translation}`);
      const data = await res.json();
      setBooks(data);
      if (data.length > 0) setSelectedBook(data[0]);
    } catch (e) {
      toast.error('Erro ao carregar livros');
    }
  };

  const [loadingChapters, setLoadingChapters] = useState(false);

  const fetchAvailableChapters = async (book: string) => {
    setLoadingChapters(true);
    try {
      const res = await fetch(`/api/bible/${book.toLowerCase()}/chapters?translation=${translation}`);
      if (res.ok) {
        const chapters = await res.json();
        setChaptersByBook((current) => ({ ...current, [book]: chapters }));
        setAvailableChapters(chapters);
        if (!chapters.includes(selectedChapter)) {
            setSelectedChapter(chapters[0] || 1);
        }
      }
    } catch {
      toast.error('Erro ao carregar capítulos');
    } finally {
      setLoadingChapters(false);
    }
  };

  useEffect(() => {
    if (selectedBook) {
      fetchAvailableChapters(selectedBook.abbrev);
      loadChapterData(selectedBook.abbrev, selectedChapter);
    }
  }, [selectedBook, selectedChapter, translation]);

  const loadChapterData = async (book: string, chapter: number) => {
    try {
      const res = await fetch(`/api/bible/${book.toLowerCase()}/${chapter}?translation=${translation}`);
      if (res.ok) {
        const data = await res.json();
        setVerses(data.verses);
      } else {
        setVerses([]);
      }
    } catch (e) {
      setVerses([]);
      toast.error('Erro ao carregar versículos.');
    }
  };

  const bookmarks = useLiveQuery(() =>
    user?.email ? db.bibleBookmarks.where('userId').equals(user.email).toArray() : [],
    [user?.email]
  );

  const isBookmarked = bookmarks?.some(b => b.translation === translation && b.book === selectedBook?.name && b.chapter === selectedChapter);

  const handleBookmark = async () => {
    if (!user?.email || !selectedBook) return;
    const existing = bookmarks?.find(b => b.translation === translation && b.book === selectedBook.name && b.chapter === selectedChapter);
    if (existing) {
      await db.bibleBookmarks.delete(existing.id!);
      toast.info('Marcador removido');
    } else {
      await db.bibleBookmarks.add({
        userId: user.email,
        translation,
        book: selectedBook.name,
        chapter: selectedChapter,
        verse: selectedVerses[0] ?? undefined,
        createdAt: new Date().toISOString(),
      });
      toast.success('Capítulo marcado!');
    }
  };

  const shareToFeed = useCallback(async () => {
    if (!user?.email || selectedVerses.length === 0 || !selectedBook) return;
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
  }, [closeDrawer, selectedBook, selectedChapter, selectedVerses, user?.email, verses]);

  const clearVerseSelection = useCallback(() => {
    setSelectedVerses([]);
    closeDrawer();
  }, [closeDrawer]);

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
  }, [canShareToFeed, clearVerseSelection, closeDrawer, copySelectedVerses, openDrawer, selectedBook, selectedChapter, selectedVerses, shareToFeed, translation, verses]);

  const openTranslationDrawer = useCallback(() => {
    openDrawer({
      content: <>
        <DrawerHeader className="border-b text-left"><DrawerTitle>Versão da Bíblia</DrawerTitle></DrawerHeader>
        <div className="grid gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {[
            ['NVI', 'Nova Versão Internacional'],
            ['ACF', 'Almeida Corrigida Fiel'],
            ['AA', 'Almeida Atualizada'],
          ].map(([code, name]) => (
            <Button key={code} type="button" variant={translation === code ? 'default' : 'outline'} className="h-auto justify-start py-3 text-left" onClick={() => {
              setTranslation(code);
              setChaptersByBook({});
              setSelectedVerses([]);
              closeDrawer();
            }}>
              <span className="font-semibold">{code}</span><span className="ml-2 text-xs opacity-80">{name}</span>
            </Button>
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

  const selectBook = (book: any) => {
    setSelectedBook(book);
    setSelectedChapter(1);
    setSelectedVerses([]);
    setBookListOpen(false);
    setSearchTerm('');
  };

  const toggleBook = async (book: any) => {
    if (expandedBook === book.abbrev) {
      setExpandedBook(null);
      return;
    }
    setExpandedBook(book.abbrev);
    if (!chaptersByBook[book.abbrev]) await fetchAvailableChapters(book.abbrev);
  };

  const selectChapterFromDrawer = (book: any, chapter: number) => {
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
                        {(testamentBooks as any[]).map((book) => {
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

          <Button size="icon" variant="ghost" onClick={handleBookmark}>
            {isBookmarked ? <BookmarkCheck className="w-5 h-5 text-primary" /> : <Bookmark className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 bg-background/50">
        <div className="max-w-2xl mx-auto px-5 py-8 pb-32">
          {verses.map((v, i) => (
            <p key={i} className={cn('text-[17px] leading-8 py-1 px-3 rounded-lg cursor-pointer', selectedVerses.includes(i) ? 'bg-primary/20 text-foreground font-medium' : 'hover:bg-muted/50')}
              onClick={() => toggleVerse(i)}>
              <sup className="text-[10px] font-bold text-primary/60 mr-1.5">{i + 1}</sup>{v}
            </p>
          ))}
        </div>
      </ScrollArea>

    </div>
  );
}
