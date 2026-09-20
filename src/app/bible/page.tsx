'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useUIStore } from '@/features/ui/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { db, type FeedPost } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { BookOpen, Share2, Bookmark, BookmarkCheck, Search, X, List, WifiOff } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { hasActionPermission } from '@/lib/access-control';

export default function BiblePage() {
  const { data: session } = useSession();
  const user = session?.user;
  const canShareToFeed = hasActionPermission(user, 'feed', 'share');
  const setPageTitle = useUIStore((state) => state.setPageTitle);

  const [books, setBooks] = useState<any[]>([]);
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [verses, setVerses] = useState<string[]>([]);
  const [availableChapters, setAvailableChapters] = useState<number[]>([]);
  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);
  const [bookListOpen, setBookListOpen] = useState(false);

  const toggleVerse = (index: number) => {
    setSelectedVerses(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index].sort((a,b) => a - b)
    );
  };

  useEffect(() => {
    setPageTitle('Bíblia');
    fetchBooks();
  }, [setPageTitle]);

  const fetchBooks = async () => {
    try {
      const res = await fetch('/api/bible/books');
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
      const res = await fetch(`/api/bible/${book.toLowerCase()}/chapters`);
      if (res.ok) {
        const chapters = await res.json();
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
  }, [selectedBook, selectedChapter]);

  const loadChapterData = async (book: string, chapter: number) => {
    const local = await db.bibleChapters.where({ book, chapter }).first();
    
    if (local) {
      setVerses(local.verses);
    } else {
      try {
        const res = await fetch(`/api/bible/${book.toLowerCase()}/${chapter}`);
        if (res.ok) {
          const data = await res.json();
          setVerses(data.verses);
          await db.bibleChapters.add({ book, chapter, verses: data.verses, testament: 'AT' });
        } else {
          setVerses([]);
        }
      } catch (e) {
        setVerses([]);
        toast.error('Erro ao carregar versículos.');
      }
    }
  };

  const bookmarks = useLiveQuery(() =>
    user?.email ? db.bibleBookmarks.where('userId').equals(user.email).toArray() : [],
    [user?.email]
  );

  const isBookmarked = bookmarks?.some(b => b.book === selectedBook?.name && b.chapter === selectedChapter);

  const handleBookmark = async () => {
    if (!user?.email || !selectedBook) return;
    const existing = bookmarks?.find(b => b.book === selectedBook.name && b.chapter === selectedChapter);
    if (existing) {
      await db.bibleBookmarks.delete(existing.id!);
      toast.info('Marcador removido');
    } else {
      await db.bibleBookmarks.add({
        userId: user.email,
        book: selectedBook.name,
        chapter: selectedChapter,
        verse: selectedVerses[0] ?? undefined,
        createdAt: new Date().toISOString(),
      });
      toast.success('Capítulo marcado!');
    }
  };

  const shareToFeed = async () => {
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
  };

  const selectBook = (book: any) => {
    setSelectedBook(book);
    setSelectedChapter(1);
    setSelectedVerses([]);
    setBookListOpen(false);
    setSearchTerm('');
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
          {/* Seletor de Livro */}
          <Sheet open={bookListOpen} onOpenChange={setBookListOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="flex-[2] justify-start gap-2 font-semibold bg-background">
                <List className="w-4 h-4" />
                {selectedBook?.name || 'Selecione...'}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[350px] p-0">
              <SheetHeader className="p-4 border-b"><SheetTitle>Livros da Bíblia</SheetTitle></SheetHeader>
              <ScrollArea className="h-[calc(100vh-100px)]">
                 <div className="p-4 space-y-4">
                    {otBooks.length > 0 && <div><p className="text-[10px] uppercase font-bold text-muted-foreground">Antigo Testamento</p>
                    {otBooks.map((b: any) => (
                      <button key={b.abbrev} onClick={() => selectBook(b)} className={cn('block w-full text-left py-2 text-sm', b.abbrev === selectedBook?.abbrev ? 'text-primary font-bold' : '')}>{b.name}</button>
                    ))}</div>}
                    {ntBooks.length > 0 && <div><p className="text-[10px] uppercase font-bold text-muted-foreground">Novo Testamento</p>
                    {ntBooks.map((b: any) => (
                      <button key={b.abbrev} onClick={() => selectBook(b)} className={cn('block w-full text-left py-2 text-sm', b.abbrev === selectedBook?.abbrev ? 'text-primary font-bold' : '')}>{b.name}</button>
                    ))}</div>}
                 </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>

          {/* Seletor de Capítulo */}
          <Select 
            value={selectedChapter.toString()} 
            onValueChange={(v) => setSelectedChapter(parseInt(v))}
          >
            <SelectTrigger className="w-[100px] bg-background">
              <SelectValue placeholder="Cap" />
            </SelectTrigger>
            <SelectContent>
              {availableChapters.length > 0 ? (
                Array.from(new Set(availableChapters)).map((ch) => (
                  <SelectItem key={`${selectedBook?.abbrev}-${ch}`} value={ch.toString()}>
                    Cap {ch}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="1">Cap 1</SelectItem>
              )}
            </SelectContent>
          </Select>

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

      {selectedVerses.length > 0 && (
        <motion.div 
          initial={{ y: 100 }} 
          animate={{ y: 0 }} 
          exit={{ y: 100 }}
          className="fixed bottom-[4.5rem] md:bottom-4 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:max-w-xl bg-card border border-border/50 shadow-xl rounded-xl p-3 flex items-center gap-2 z-50 backdrop-blur-xl"
        >
          <div className="flex-1 min-w-0">
             <p className="text-xs font-bold text-primary mb-0.5 truncate">{selectedBook?.name} {selectedChapter}:{selectedVerses.join(',')}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button size="sm" variant="ghost" onClick={() => setSelectedVerses([])} className="h-8 w-8 p-0">
              <X className="w-4 h-4" />
            </Button>
            {canShareToFeed ? <Button size="sm" onClick={shareToFeed} className="h-8 px-3 text-xs gap-1.5 shadow-sm">
              <Share2 className="w-3.5 h-3.5" /> 
              <span className="hidden sm:inline">Compartilhar ({selectedVerses.length})</span>
            </Button> : null}
          </div>
        </motion.div>
      )}
    </div>
  );
}
