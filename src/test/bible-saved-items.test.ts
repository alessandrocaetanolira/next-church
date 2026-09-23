import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/lib/db';

describe('itens bíblicos salvos', () => {
  beforeEach(async () => {
    await db.bibleFavorites.clear();
    await db.bibleAnnotations.clear();
  });

  it('persiste favorito e anotação para a mesma seleção de versículos', async () => {
    const reference = {
      userId: 'membro@igreja.test',
      translation: 'NVI' as const,
      bookAbbrev: 'gn',
      bookName: 'Gênesis',
      testament: 'AT' as const,
      chapter: 1,
      verseNumbers: [1, 3],
      selectionKey: '1,3',
      createdAt: '2026-09-23T00:00:00.000Z',
    };

    await db.bibleFavorites.add(reference);
    await db.bibleAnnotations.add({ ...reference, note: 'A criação aponta para Deus.', updatedAt: reference.createdAt });

    await expect(db.bibleFavorites.where('userId').equals(reference.userId).toArray()).resolves.toMatchObject([
      { translation: 'NVI', bookAbbrev: 'gn', verseNumbers: [1, 3] },
    ]);
    await expect(db.bibleAnnotations.where('userId').equals(reference.userId).toArray()).resolves.toMatchObject([
      { note: 'A criação aponta para Deus.', selectionKey: '1,3' },
    ]);
  });
});
