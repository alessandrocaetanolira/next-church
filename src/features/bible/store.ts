import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BibleTranslation } from './api/bible.api';

type BibleReadingState = {
  tenantId: string | null;
  translation: BibleTranslation;
  bookAbbrev: string | null;
  chapter: number;
  setTenant: (tenantId: string) => void;
  setTranslation: (translation: BibleTranslation) => void;
  setBook: (bookAbbrev: string) => void;
  setChapter: (chapter: number) => void;
};

export const useBibleReadingStore = create<BibleReadingState>()(
  persist(
    (set) => ({
      tenantId: null,
      translation: 'NVI',
      bookAbbrev: null,
      chapter: 1,
      setTenant: (tenantId) => set((current) => current.tenantId === tenantId ? current : { tenantId, bookAbbrev: null, chapter: 1 }),
      setTranslation: (translation) => set({ translation, bookAbbrev: null, chapter: 1 }),
      setBook: (bookAbbrev) => set({ bookAbbrev }),
      setChapter: (chapter) => set({ chapter }),
    }),
    {
      name: 'church-bible-reading',
      partialize: (state) => ({
        tenantId: state.tenantId,
        translation: state.translation,
        bookAbbrev: state.bookAbbrev,
        chapter: state.chapter,
      }),
    },
  ),
);
