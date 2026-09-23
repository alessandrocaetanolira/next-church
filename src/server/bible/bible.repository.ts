import type { PrismaClient as BiblePrismaClient } from '@/generated/prisma-bible';

export class BibleRepository {
  constructor(private readonly prisma: BiblePrismaClient) {}

  async listBooks(translation: string) {
    const books = await this.prisma.bibleBook.findMany({
      orderBy: { position: 'asc' },
      select: { id: true, name: true, abbrev: true, testament: true },
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
}
