import fs from 'fs';
import path from 'path';
import { disconnectBible, getBibleClient } from '../../src/lib/prisma-factory';

const translations = ['AA', 'ACF', 'NVI'] as const;
type Translation = typeof translations[number];
type SourceBook = { abbrev: string; name: string; chapters: string[][] };

const sourceDirectory = path.resolve(process.env.BIBLE_SOURCE_DIR ?? path.join(process.cwd(), 'prisma', 'bible-source'));

function testamentFor(index: number) {
  return index < 39 ? 'AT' : 'NT';
}

function sourceFor(translation: Translation): SourceBook[] {
  const filename = path.join(sourceDirectory, `${translation.toLowerCase()}.json`);
  if (!fs.existsSync(filename)) throw new Error(`Fonte bíblica ausente: ${filename}`);
  const source = JSON.parse(fs.readFileSync(filename, 'utf8').replace(/^\uFEFF/, '')) as SourceBook[];
  if (source.length !== 66) throw new Error(`A fonte ${translation} deveria conter 66 livros, mas contém ${source.length}.`);
  return source;
}

async function importTranslation(translation: Translation, source: SourceBook[]) {
  const prisma = getBibleClient();
  try {
    const expectedVerseCount = source.reduce((total, book) => total + book.chapters.reduce((chapterTotal, verses) => chapterTotal + verses.length, 0), 0);
    const [bookCount, verseCount] = await Promise.all([
      prisma.bibleBook.count(),
      prisma.bibleVerse.count({ where: { translationCode: translation } }),
    ]);
    if (bookCount === 66 && verseCount === expectedVerseCount) return;

    await prisma.$transaction(async (tx) => {
      await tx.bibleTranslation.upsert({
        where: { code: translation },
        update: { name: translation },
        create: { code: translation, name: translation },
      });
      await tx.bibleVerse.deleteMany({ where: { translationCode: translation } });

      for (const [bookIndex, item] of source.entries()) {
        const book = await tx.bibleBook.upsert({
          where: { abbrev: item.abbrev },
          update: { name: item.name, testament: testamentFor(bookIndex), position: bookIndex + 1 },
          create: { name: item.name, abbrev: item.abbrev, testament: testamentFor(bookIndex), position: bookIndex + 1 },
        });
        for (const [chapterIndex, verses] of item.chapters.entries()) {
          await tx.bibleVerse.createMany({
            data: verses.map((text, verseIndex) => ({
              translationCode: translation,
              bookId: book.id,
              chapter: chapterIndex + 1,
              number: verseIndex + 1,
              text,
            })),
          });
        }
      }
    }, { timeout: 120_000 });
  } finally {
    await disconnectBible();
  }
}

async function main() {
  for (const translation of translations) {
    await importTranslation(translation, sourceFor(translation));
    console.log(`${translation} importada para o banco bíblico compartilhado.`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
