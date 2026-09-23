'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { getBibleChapter, type BibleTranslation } from '../api/bible.api';

export function useBibleChapter(book: string, chapter: number, translation: BibleTranslation = 'NVI') {
  return useLiveQuery(
    async () => (await getBibleChapter(book, chapter, translation)).data,
    [book, chapter, translation],
  );
}
