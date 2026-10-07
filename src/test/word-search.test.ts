import { describe, expect, it } from 'vitest';
import { createWordSearchGrid, WORD_SEARCH_PUZZLES } from '@/features/new-games/games/WordSearch';

describe('caça-palavras', () => {
  it('posiciona todas as palavras exibidas dentro do tabuleiro', () => {
    for (const puzzle of WORD_SEARCH_PUZZLES) {
      for (let attempt = 0; attempt < 12; attempt++) {
        const { grid, placements } = createWordSearchGrid(puzzle.words, puzzle.size);

        expect(placements).toHaveLength(puzzle.words.length);
        expect(new Set(placements.map(({ word }) => word))).toEqual(new Set(puzzle.words));

        for (const placement of placements) {
          expect(placement.cells).toHaveLength(placement.word.length);

          placement.cells.forEach(([row, column], index) => {
            expect(row).toBeGreaterThanOrEqual(0);
            expect(row).toBeLessThan(puzzle.size);
            expect(column).toBeGreaterThanOrEqual(0);
            expect(column).toBeLessThan(puzzle.size);
            expect(grid[row][column]).toBe(placement.word[index]);
          });
        }
      }
    }
  });
});
