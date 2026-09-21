import type { PrismaClient as TenantPrismaClient } from '@/generated/prisma-tenant';

export class BibleRepository {
  constructor(private readonly prisma: TenantPrismaClient) {}

  listBooks() { return this.prisma.book.findMany({ orderBy: { id: 'asc' }, select: { id: true, name: true, abbrev: true, testament: true } }); }

  async listChapterNumbers(abbrev: string) {
    const book = await this.prisma.book.findUnique({ where: { abbrev }, include: { chapters: { select: { number: true }, orderBy: { number: 'asc' } } } });
    return book ? book.chapters.map((chapter) => chapter.number) : null;
  }

  findChapter(abbrev: string, number: number) {
    return this.prisma.book.findUnique({ where: { abbrev }, include: { chapters: { where: { number }, include: { verses: { orderBy: { number: 'asc' } } } } } });
  }
}
