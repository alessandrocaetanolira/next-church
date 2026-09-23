import type { PrismaClient as BiblePrismaClient } from '@/generated/prisma-bible';

export class BibleRepository {
  constructor(private readonly prisma: BiblePrismaClient) {}

  async listBooks(translation: string) {
    const books = await this.prisma.bibleBook.findMany({
      orderBy: { position: 'asc' },
      select: { id: true, name: true, abbrev: true, testament: true, position: true },
    });
    return books.map((book) => ({ ...book, translation }));
  }

  async listChapterNumbers(abbrev: string, translation: string) {
    const book = await this.prisma.bibleBook.findUnique({ where: { abbrev }, select: { id: true } });
    if (!book) return null;
    const chapters = await this.prisma.bibleVerse.groupBy({
      by: ['chapter'],
      where: { translationCode: translation, bookId: book.id },
      orderBy: { chapter: 'asc' },
    });
    return chapters.map((chapter) => chapter.chapter);
  }

  async findChapter(abbrev: string, number: number, translation: string) {
    const book = await this.prisma.bibleBook.findUnique({ where: { abbrev }, select: { id: true, name: true } });
    if (!book) return null;
    const verses = await this.prisma.bibleVerse.findMany({
      where: { translationCode: translation, bookId: book.id, chapter: number },
      orderBy: { number: 'asc' },
      select: { text: true },
    });
    return { ...book, verses };
  }

  async contentManifest() {
    return this.prisma.$queryRawUnsafe<Array<{ translationCode: string; verseCount: number; bookCount: number }>>(
      `SELECT v.translationCode, COUNT(v.id) AS verseCount, COUNT(DISTINCT v.bookId) AS bookCount
         FROM "BibleVerse" v GROUP BY v.translationCode ORDER BY v.translationCode ASC`,
    );
  }
}
