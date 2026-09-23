import { db, type OfflineBibleBook, type OfflineBibleChapter, type OfflineBibleDownload } from '@/lib/db';

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
const DOWNLOAD_CONCURRENCY = 4;

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
  if (cached?.contentVersion === CACHE_VERSION) {
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

export type BibleDownloadProgress = Pick<OfflineBibleDownload, 'translation' | 'status' | 'downloadedChapters' | 'totalChapters'>;

type DownloadOptions = {
  fetcher?: typeof fetch;
  onProgress?: (progress: BibleDownloadProgress) => void;
};

async function saveDownloadProgress(translation: BibleTranslation, downloadedChapters: number, totalChapters: number, status: OfflineBibleDownload['status']) {
  const progress: OfflineBibleDownload = {
    translation,
    status,
    downloadedChapters,
    totalChapters,
    contentVersion: CACHE_VERSION,
    updatedAt: new Date().toISOString(),
  };
  await db.offlineBibleDownloads.put(progress);
  return progress;
}

/** Baixa uma versão inteira, mantendo capítulos já cacheados para permitir retomada. */
export async function downloadBibleTranslation(translation: BibleTranslation, options: DownloadOptions = {}) {
  const fetcher = options.fetcher ?? fetch;
  const books = (await getBibleBooks(translation, fetcher)).data;
  const chaptersByBook = await Promise.all(books.map(async (book) => ({
    book,
    chapters: (await getBibleChapters(book.abbrev, translation, fetcher)).data,
  })));
  const chapterTasks = chaptersByBook.flatMap(({ book, chapters }) => chapters.map((chapter) => ({ book, chapter })));
  const totalChapters = chapterTasks.length;
  const cachedChapters = await db.offlineBibleChapters.where('translation').equals(translation).toArray();
  let downloadedChapters = chapterTasks.filter(({ book, chapter }) => cachedChapters.some((cached) => cached.bookAbbrev === book.abbrev && cached.chapter === chapter && cached.contentVersion === CACHE_VERSION)).length;

  const current = await db.offlineBibleDownloads.get(translation);
  if (current?.status === 'downloading') return current;
  let progress = await saveDownloadProgress(translation, downloadedChapters, totalChapters, 'downloading');
  options.onProgress?.(progress);

  let cursor = 0;
  let stopped = false;
  const worker = async () => {
    while (!stopped) {
      const task = chapterTasks[cursor++];
      if (!task) return;
      const state = await db.offlineBibleDownloads.get(translation);
      if (state?.status === 'paused') {
        stopped = true;
        return;
      }
      const cached = await db.offlineBibleChapters.get([translation, task.book.abbrev, task.chapter]);
      if (!cached || cached.contentVersion !== CACHE_VERSION) {
        await getBibleChapter(task.book.abbrev, task.chapter, translation, fetcher);
      }
      downloadedChapters += 1;
      const latest = await db.offlineBibleDownloads.get(translation);
      if (latest?.status === 'paused') {
        stopped = true;
        return;
      }
      progress = await saveDownloadProgress(translation, downloadedChapters, totalChapters, 'downloading');
      options.onProgress?.(progress);
    }
  };

  try {
    await Promise.all(Array.from({ length: Math.min(DOWNLOAD_CONCURRENCY, Math.max(chapterTasks.length, 1)) }, worker));
    const latest = await db.offlineBibleDownloads.get(translation);
    if (latest?.status === 'paused') return latest;
    progress = await saveDownloadProgress(translation, downloadedChapters, totalChapters, 'ready');
    options.onProgress?.(progress);
    return progress;
  } catch (error) {
    progress = await saveDownloadProgress(translation, downloadedChapters, totalChapters, 'error');
    options.onProgress?.(progress);
    throw error;
  }
}

export async function pauseBibleDownload(translation: BibleTranslation) {
  const current = await db.offlineBibleDownloads.get(translation);
  if (!current || current.status !== 'downloading') return current;
  return saveDownloadProgress(translation, current.downloadedChapters, current.totalChapters, 'paused');
}

export async function removeBibleDownload(translation: BibleTranslation) {
  await db.offlineBibleChapters.where('translation').equals(translation).delete();
  await db.offlineBibleDownloads.delete(translation);
}
