'use client';

import { BookmarkCheck, ChevronDown, ChevronsUpDown, List, WifiOff } from 'lucide-react';
import type { BibleBook, BibleContentSource, BibleTranslation } from '@/features/bible/api/bible.api';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

type BibleWebNavigationProps = {
  translation: BibleTranslation;
  selectedBook: BibleBook | null;
  selectedChapter: number;
  contentSource: BibleContentSource;
  books: BibleBook[];
  chaptersByBook: Record<string, number[]>;
  expandedBook: string | null;
  bookListOpen: boolean;
  onBookListOpenChange: (open: boolean) => void;
  onToggleBook: (book: BibleBook) => void;
  onSelectChapter: (book: BibleBook, chapter: number) => void;
  onOpenTranslation: () => void;
  onOpenChapter: () => void;
  onOpenSavedItems: () => void;
};

export function BibleWebNavigation({
  translation,
  selectedBook,
  selectedChapter,
  contentSource,
  books,
  chaptersByBook,
  expandedBook,
  bookListOpen,
  onBookListOpenChange,
  onToggleBook,
  onSelectChapter,
  onOpenTranslation,
  onOpenChapter,
  onOpenSavedItems,
}: BibleWebNavigationProps) {
  const otBooks = books.filter((book) => book.testament === 'AT');
  const ntBooks = books.filter((book) => book.testament === 'NT');

  return (
    <div className="space-y-2 border-b border-border bg-card px-4 py-3">
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" className="w-[78px] justify-between bg-background px-2" onClick={onOpenTranslation}>
          {translation}<ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
        <Drawer open={bookListOpen} onOpenChange={onBookListOpenChange}>
          <DrawerTrigger asChild>
            <Button variant="outline" className="flex-[2] justify-start gap-2 bg-background font-semibold"><List className="h-4 w-4" />{selectedBook?.name || 'Selecione...'}</Button>
          </DrawerTrigger>
          <DrawerContent className="max-h-[82dvh]">
            <DrawerHeader className="border-b text-left"><DrawerTitle>Livros da Bíblia</DrawerTitle></DrawerHeader>
            <ScrollArea className="h-[calc(82dvh-6.5rem)] px-4 pb-6">
              {[['Antigo Testamento', otBooks], ['Novo Testamento', ntBooks]].map(([title, testamentBooks], index) => (
                <div key={title as string}>
                  {index > 0 && <Separator />}
                  <section className="py-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title as string}</p>
                    <div className="divide-y divide-border rounded-lg border border-border">
                      {(testamentBooks as BibleBook[]).map((book) => {
                        const isExpanded = expandedBook === book.abbrev;
                        const chapters = chaptersByBook[book.abbrev] ?? [];
                        return <div key={`${translation}-${book.abbrev}`}>
                          <button type="button" onClick={() => onToggleBook(book)} className="flex w-full items-center justify-between px-3 py-3 text-left text-sm font-medium">
                            <span className={cn(book.abbrev === selectedBook?.abbrev ? 'text-primary' : 'text-foreground')}>{book.name}</span>
                            <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', isExpanded && 'rotate-180')} />
                          </button>
                          {isExpanded && <div className="grid grid-cols-6 gap-2 border-t border-border bg-muted/40 p-3">{chapters.map((chapter) => <Button key={`${book.abbrev}-${chapter}`} type="button" variant={book.abbrev === selectedBook?.abbrev && chapter === selectedChapter ? 'default' : 'outline'} size="sm" className="h-9 px-0" onClick={() => onSelectChapter(book, chapter)}>{chapter}</Button>)}</div>}
                        </div>;
                      })}
                    </div>
                  </section>
                </div>
              ))}
            </ScrollArea>
          </DrawerContent>
        </Drawer>
        <Button type="button" variant="outline" className="w-[100px] justify-between bg-background px-2" onClick={onOpenChapter}>Cap {selectedChapter}<ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" /></Button>
        <Button size="icon" variant="ghost" onClick={onOpenSavedItems} aria-label="Itens salvos"><BookmarkCheck className="h-5 w-5" /></Button>
      </div>
      {contentSource === 'cache' && <p className="flex items-center gap-1 text-xs text-muted-foreground"><WifiOff className="h-3.5 w-3.5" /> Conteúdo salvo no dispositivo</p>}
    </div>
  );
}
