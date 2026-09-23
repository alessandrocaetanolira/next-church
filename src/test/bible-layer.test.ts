import { describe, expect, it, vi } from 'vitest';
import { BiblePolicy } from '@/server/bible/bible.policy';
import { BibleService } from '@/server/bible/bible.service';
import type { BibleRepository } from '@/server/bible/bible.repository';

const reader = { role: 'MEMBER', permissions: ['bible:view'], planFeatures: ['bible'] };
const blocked = { role: 'MEMBER', permissions: [], planFeatures: ['bible'] };

function repositoryMock() {
  return {
    listBooks: vi.fn().mockResolvedValue([{ id: 'book-1', name: 'Gênesis', abbrev: 'gn', testament: 'AT' }]),
    listChapterNumbers: vi.fn().mockResolvedValue([1, 2]),
    findChapter: vi.fn().mockResolvedValue({ name: 'Gênesis', verses: [{ text: 'No princípio' }] }),
  } as unknown as BibleRepository;
}

describe('camadas da Bíblia', () => {
  it('protege leitura por bible:view', () => {
    expect(() => BiblePolicy.assertView(reader)).not.toThrow();
    expect(() => BiblePolicy.assertView(blocked)).toThrow('Bíblia');
  });

  it('resolve alias e retorna capítulos e versículos', async () => {
    const repository = repositoryMock();
    const service = new BibleService(repository);

    await expect(service.listChapters('gênesis')).resolves.toEqual([1, 2]);
    await expect(service.getChapter('gênesis', '1')).resolves.toEqual({ book: 'Gênesis', chapter: 1, translation: 'NVI', verses: ['No princípio'] });
    expect(repository.listChapterNumbers).toHaveBeenCalledWith('gn', 'NVI');
    expect(repository.findChapter).toHaveBeenCalledWith('gn', 1, 'NVI');
  });

  it('rejeita capítulo inválido', async () => {
    const service = new BibleService(repositoryMock());
    await expect(service.getChapter('gn', 'zero')).rejects.toThrow('Capítulo inválido');
  });
});
