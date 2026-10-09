import { describe, expect, it } from 'vitest';
import { createMemoryChallengeBoard, MEMORY_CARD_CATALOG } from '@/lib/games/memory-card-catalog';

describe('tabuleiro compartilhado de memória', () => {
  it('gera exatamente dois cartões de cada imagem canônica', () => {
    const board = createMemoryChallengeBoard(() => 0.5);

    expect(board).toHaveLength(MEMORY_CARD_CATALOG.length * 2);

    for (const card of MEMORY_CARD_CATALOG) {
      expect(board.filter((id) => id === card.id)).toHaveLength(2);
      expect(card.image).toMatch(/^\/jogos-novos\/memory\/.+\.png$/);
    }
  });
});
