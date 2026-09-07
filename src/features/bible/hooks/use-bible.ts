'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';

export function useBibleChapter(book: string, chapter: number) {
  return useLiveQuery(
    async () => {
      // Tenta buscar no Dexie (Cache Offline)
      const cached = await db.bibleChapters
        .where('book')
        .equals(book)
        .and(c => c.chapter === chapter)
        .first();

      if (cached) return cached;

      // Se não encontrar, tenta buscar na API
      try {
        const res = await fetch(`/api/bible/${book}/${chapter}`);
        if (!res.ok) return null;
        const data = await res.json();
        
        // Salva no Dexie para futuras leituras offline
        await db.bibleChapters.add(data);
        return data;
      } catch (err) {
        console.error('Erro ao carregar Bíblia online', err);
        return null;
      }
    },
    [book, chapter]
  );
}
