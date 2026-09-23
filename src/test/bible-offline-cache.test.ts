import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/lib/db';
import { getBibleBooks, getBibleChapter } from '@/features/bible/api/bible.api';

describe('cache offline da Bíblia', () => {
  beforeEach(async () => {
    await db.offlineBibleBooks.clear();
    await db.offlineBibleChapters.clear();
    await db.offlineBibleDownloads.clear();
  });

  it('prioriza um catálogo completo salvo no dispositivo', async () => {
    await db.offlineBibleBooks.bulkPut(Array.from({ length: 66 }, (_, index) => ({
      translation: 'NVI' as const,
      abbrev: `b${index + 1}`,
      name: `Livro ${index + 1}`,
      testament: index < 39 ? 'AT' as const : 'NT' as const,
      position: index + 1,
      cachedAt: '2026-09-23T00:00:00.000Z',
      contentVersion: 'shared-bible-v1',
    })));
    const fetcher = vi.fn() as unknown as typeof fetch;

    const result = await getBibleBooks('NVI', fetcher);

    expect(result.source).toBe('cache');
    expect(result.data).toHaveLength(66);
    expect(result.data[0]?.name).toBe('Livro 1');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('lê um capítulo salvo quando a rede não está disponível', async () => {
    await db.offlineBibleBooks.put({
      translation: 'NVI', abbrev: 'gn', name: 'Gênesis', testament: 'AT', position: 1,
      cachedAt: '2026-09-23T00:00:00.000Z', contentVersion: 'shared-bible-v1',
    });
    await db.offlineBibleChapters.put({
      translation: 'NVI', bookAbbrev: 'gn', chapter: 1,
      verses: ['No princípio, Deus criou os céus e a terra.'],
      cachedAt: '2026-09-23T00:00:00.000Z', contentVersion: 'shared-bible-v1',
    });
    const fetcher = vi.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;

    const result = await getBibleChapter('gn', 1, 'NVI', fetcher);

    expect(result.source).toBe('cache');
    expect(result.data).toEqual({
      book: 'Gênesis', chapter: 1, translation: 'NVI',
      verses: ['No princípio, Deus criou os céus e a terra.'],
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('armazena o capítulo retornado pela API para a próxima leitura', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      book: 'Gênesis', chapter: 1, translation: 'NVI', verses: ['No princípio'],
    }), { status: 200 })) as unknown as typeof fetch;

    const result = await getBibleChapter('gn', 1, 'NVI', fetcher);

    expect(result.source).toBe('network');
    await expect(db.offlineBibleChapters.get(['NVI', 'gn', 1])).resolves.toMatchObject({ verses: ['No princípio'] });
  });
});
