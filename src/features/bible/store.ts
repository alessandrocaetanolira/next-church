import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BibleTranslation } from './api/bible.api';

export const BIBLE_FONT_SIZE_MIN = 13;
export const BIBLE_FONT_SIZE_MAX = 40;

type BibleReadingState = {
  tenantId: string | null;
  translation: BibleTranslation;
  bookAbbrev: string | null;
  chapter: number;
  fontSize: number;
  keepScreenAwake: boolean;
  wakeLockSupported: boolean | null;
  wakeLockActive: boolean;
  setTenant: (tenantId: string) => void;
  setTranslation: (translation: BibleTranslation) => void;
  setBook: (bookAbbrev: string) => void;
  setChapter: (chapter: number) => void;
  setFontSize: (fontSize: number) => void;
  setKeepScreenAwake: (keepScreenAwake: boolean) => void;
  setWakeLockSupported: (supported: boolean) => void;
  setWakeLockActive: (active: boolean) => void;
};

export const useBibleReadingStore = create<BibleReadingState>()(
  persist(
    (set) => ({
      tenantId: null,
      translation: 'NVI',
      bookAbbrev: null,
      chapter: 1,
      fontSize: 17,
      keepScreenAwake: true,
      wakeLockSupported: null,
      wakeLockActive: false,
      setTenant: (tenantId) => set((current) => current.tenantId === tenantId ? current : { tenantId, bookAbbrev: null, chapter: 1 }),
      setTranslation: (translation) => set({ translation, bookAbbrev: null, chapter: 1 }),
      setBook: (bookAbbrev) => set({ bookAbbrev }),
      setChapter: (chapter) => set({ chapter }),
      setFontSize: (fontSize) => set({ fontSize: Math.min(BIBLE_FONT_SIZE_MAX, Math.max(BIBLE_FONT_SIZE_MIN, fontSize)) }),
      setKeepScreenAwake: (keepScreenAwake) => set({ keepScreenAwake }),
      setWakeLockSupported: (wakeLockSupported) => set({ wakeLockSupported }),
      setWakeLockActive: (wakeLockActive) => set({ wakeLockActive }),
    }),
    {
      name: 'church-bible-reading',
      partialize: (state) => ({
        tenantId: state.tenantId,
        translation: state.translation,
        bookAbbrev: state.bookAbbrev,
        chapter: state.chapter,
        fontSize: state.fontSize,
        keepScreenAwake: state.keepScreenAwake,
      }),
    },
  ),
);
