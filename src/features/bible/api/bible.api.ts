import { db, type OfflineBibleBook, type OfflineBibleChapter } from '@/lib/db';

export type BibleTranslation = 'AA' | 'ACF' | 'NVI';
export type BibleContentSource = 'cache' | 'network';

export type BibleBook = Pick<OfflineBibleBook, 'abbrev' | 'name' | 'testament' | 'position'> & {
  translation: BibleTranslation;
};

export type BibleChapter = {
  book: string;
  chapter: number;
  translation: BibleTranslation;
  verses: string[];
};

export type CachedBibleResult<T> = {
  data: T;
  source: BibleContentSource;
};

const CACHE_VERSION = 'shared-bible-v1';

async function requestJson<T>(url: string, fetcher: typeof fetch): Promise<T> {
  const response = await fetcher(url);
  if (!response.ok) throw new Error(`Não foi possível carregar a Bíblia (${response.status}).`);
  return response.json() as Promise<T>;
}

export async function getBibleBooks(translation: BibleTranslation, fetcher: typeof fetch = fetch): Promise<CachedBibleResult<BibleBook[]>> {
  const cached = await db.offlineBibleBooks.where('translation').equals(translation).sortBy('position');
  if (cached.length === 66) {
    return { data: cached, source: 'cache' };
  }

  const books = await requestJson<BibleBook[]>(`/api/bible/books?translation=${translation}`, fetcher);
  const cachedAt = new Date().toISOString();
  await db.offlineBibleBooks.bulkPut(books.map((book, index) => ({
    ...book,
    position: book.position ?? index + 1,
    cachedAt,
    contentVersion: CACHE_VERSION,
  })));
  return { data: books, source: 'network' };
}

export async function getBibleChapters(bookAbbrev: string, translation: BibleTranslation, fetcher: typeof fetch = fetch): Promise<CachedBibleResult<number[]>> {
  const cachedBook = await db.offlineBibleBooks.get([translation, bookAbbrev]);
  if (cachedBook?.chapterNumbers?.length) {
    return { data: cachedBook.chapterNumbers, source: 'cache' };
  }

  const chapters = await requestJson<number[]>(`/api/bible/${bookAbbrev.toLowerCase()}/chapters?translation=${translation}`, fetcher);
  if (cachedBook) {
    await db.offlineBibleBooks.put({ ...cachedBook, chapterNumbers: chapters, cachedAt: new Date().toISOString() });
  }
  return { data: chapters, source: 'network' };
}

export async function getBibleChapter(bookAbbrev: string, chapter: number, translation: BibleTranslation, fetcher: typeof fetch = fetch): Promise<CachedBibleResult<BibleChapter>> {
  const cacheKey = [translation, bookAbbrev, chapter] as [BibleTranslation, string, number];
  const cached = await db.offlineBibleChapters.get(cacheKey);
  if (cached) {
    const book = await db.offlineBibleBooks.get([translation, bookAbbrev]);
    return {
      data: { book: book?.name ?? bookAbbrev, chapter, translation, verses: cached.verses },
      source: 'cache',
    };
  }

  const data = await requestJson<BibleChapter>(`/api/bible/${bookAbbrev.toLowerCase()}/${chapter}?translation=${translation}`, fetcher);
  const entry: OfflineBibleChapter = {
    translation,
    bookAbbrev,
    chapter,
    verses: data.verses,
    cachedAt: new Date().toISOString(),
    contentVersion: CACHE_VERSION,
  };
  await db.offlineBibleChapters.put(entry);
  return { data, source: 'network' };
}
