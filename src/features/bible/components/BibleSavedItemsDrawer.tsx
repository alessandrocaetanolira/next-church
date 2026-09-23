'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { BookmarkCheck, NotebookPen } from 'lucide-react';
import { DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { db, type BibleAnnotation, type BibleFavorite } from '@/lib/db';

type SavedBibleItem = BibleFavorite | BibleAnnotation;

type BibleSavedItemsDrawerProps = {
  userId: string;
  onSelect: (item: SavedBibleItem) => void;
};

function reference(item: SavedBibleItem) {
  return `${item.bookName} ${item.chapter}:${item.verseNumbers.join(', ')} · ${item.translation}`;
}

export function BibleSavedItemsDrawer({ userId, onSelect }: BibleSavedItemsDrawerProps) {
  const favorites = useLiveQuery(
    () => db.bibleFavorites.where('userId').equals(userId).reverse().sortBy('createdAt'),
    [userId],
    [],
  );
  const annotations = useLiveQuery(
    () => db.bibleAnnotations.where('userId').equals(userId).reverse().sortBy('updatedAt'),
    [userId],
    [],
  );

  return <>
    <DrawerHeader className="border-b text-left"><DrawerTitle>Itens salvos</DrawerTitle></DrawerHeader>
    <Tabs defaultValue="favorites" className="min-h-0 flex-1 p-4">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="favorites">Favoritos ({favorites.length})</TabsTrigger>
        <TabsTrigger value="annotations">Anotações ({annotations.length})</TabsTrigger>
      </TabsList>
      <TabsContent value="favorites">
        <ScrollArea className="h-[calc(70dvh-10rem)]">
          <div className="space-y-2 pt-3">
            {favorites.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Nenhum versículo favorito ainda.</p> : favorites.map((favorite) => <button key={favorite.id} type="button" className="flex w-full items-start gap-3 rounded-lg border p-3 text-left hover:bg-muted" onClick={() => onSelect(favorite)}>
              <BookmarkCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span className="text-sm font-medium">{reference(favorite)}</span>
            </button>)}
          </div>
        </ScrollArea>
      </TabsContent>
      <TabsContent value="annotations">
        <ScrollArea className="h-[calc(70dvh-10rem)]">
          <div className="space-y-2 pt-3">
            {annotations.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma anotação ainda.</p> : annotations.map((annotation) => <button key={annotation.id} type="button" className="flex w-full items-start gap-3 rounded-lg border p-3 text-left hover:bg-muted" onClick={() => onSelect(annotation)}>
              <NotebookPen className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0"><span className="block text-sm font-medium">{reference(annotation)}</span><span className="mt-1 block line-clamp-2 text-xs text-muted-foreground">{annotation.note}</span></span>
            </button>)}
          </div>
        </ScrollArea>
      </TabsContent>
    </Tabs>
  </>;
}
