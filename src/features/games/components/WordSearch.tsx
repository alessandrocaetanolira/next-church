"use client";

import { type MouseEvent as ReactMouseEvent, type TouchEvent as ReactTouchEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { RefreshCw } from 'lucide-react';

type Cell = { row: number; col: number };

type ThemeDefinition = {
  id: string;
  title: string;
  subtitle: string;
  words: string[];
};

type WordDefinition = {
  id: string;
  label: string;
  start: Cell;
  end: Cell;
  color: string;
};

const BOARD_SIZE = 12;
const MAX_WORDS_PER_THEME = 6;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const WORD_COLORS = [
  'bg-sky-500 text-white',
  'bg-emerald-500 text-white',
  'bg-amber-500 text-white',
  'bg-violet-500 text-white',
  'bg-rose-500 text-white',
  'bg-primary text-primary-foreground',
  'bg-orange-500 text-white',
  'bg-teal-500 text-white',
];

const THEMES: ThemeDefinition[] = [
  { id: 'evangelho', title: 'Evangelho', subtitle: 'Palavras centrais da mensagem cristã.', words: ['GRACA', 'FE', 'PERDAO', 'SALVACAO', 'CRUZ', 'VIDA'] },
  { id: 'louvor', title: 'Louvor', subtitle: 'Expressões comuns de adoração e música.', words: ['LOUVOR', 'ADORACAO', 'HINO', 'CANTO', 'HARPA', 'MELODIA'] },
  { id: 'oracao', title: 'Oração', subtitle: 'Termos ligados à vida de oração.', words: ['ORACAO', 'JEJUM', 'CLAMOR', 'INTERCEDER', 'AMEM', 'ALTAR'] },
  { id: 'biblia', title: 'Bíblia', subtitle: 'Livros e elementos bíblicos conhecidos.', words: ['GENESIS', 'SALMOS', 'PROVERBIOS', 'EVANGELHO', 'APOSTOLO', 'PACTO'] },
  { id: 'jesus', title: 'Jesus', subtitle: 'Nomes e símbolos ligados a Cristo.', words: ['JESUS', 'MESSIAS', 'CORDEIRO', 'REI', 'SENHOR', 'RESSUSCITOU'] },
  { id: 'discipulado', title: 'Discipulado', subtitle: 'Crescimento e caminhada cristã.', words: ['DISCIPULO', 'SERVICO', 'MISSAO', 'ENSINO', 'OBEDIENCIA', 'CHAMADO'] },
  { id: 'fruto', title: 'Fruto do Espírito', subtitle: 'Virtudes da vida cristã.', words: ['AMOR', 'PAZ', 'BONDADE', 'MANSIDAO', 'DOMINIO', 'ALEGRIA'] },
  { id: 'igreja', title: 'Igreja', subtitle: 'Vida em comunidade e culto.', words: ['COMUNHAO', 'TEMPLO', 'MEMBROS', 'MINISTERIO', 'PASTOR', 'DIACONO'] },
  { id: 'milagres', title: 'Milagres', subtitle: 'Sinais e maravilhas.', words: ['MILAGRE', 'CURA', 'PODER', 'SINAIS', 'MARAVILHA', 'FE'] },
  { id: 'profetas', title: 'Profetas', subtitle: 'Vocabulário da proclamação profética.', words: ['PROFETA', 'VISAO', 'PROMESSA', 'JUSTICA', 'PALAVRA', 'ALIANCA'] },
  { id: 'adoracao', title: 'Adoração', subtitle: 'Ambiente de reverência e entrega.', words: ['SANTIDADE', 'GLORIA', 'REVERENCIA', 'INCENSO', 'TRONO', 'EXALTAR'] },
  { id: 'missoes', title: 'Missões', subtitle: 'Termos de envio e expansão do evangelho.', words: ['MISSOES', 'NACOES', 'ENVIO', 'TESTEMUNHO', 'SEARA', 'COLHEITA'] },
  { id: 'criancas', title: 'Infantil', subtitle: 'Tema leve com foco em ensino bíblico infantil.', words: ['CRIANCAS', 'ARCA', 'NOE', 'DANIEL', 'DAVI', 'JOSE'] },
  { id: 'social', title: 'Projetos Sociais', subtitle: 'Ações práticas de cuidado e serviço.', words: ['DOACAO', 'ALIMENTO', 'ROUPAS', 'ABRACO', 'CUIDADO', 'SERVIR'] },
  { id: 'pascoa', title: 'Páscoa', subtitle: 'Vocabulário do sacrifício e ressurreição.', words: ['PASCOA', 'SEPULCRO', 'RESSURREICAO', 'CORDEIRO', 'SANGUE', 'VITORIA'] },
  { id: 'pentecostes', title: 'Pentecostes', subtitle: 'Atos e derramar do Espírito.', words: ['PENTECOSTES', 'ESPIRITO', 'FOGO', 'VENTO', 'LINGUAS', 'ATOS'] },
  { id: 'familia', title: 'Família', subtitle: 'Palavras de cuidado e aliança familiar.', words: ['FAMILIA', 'CASAMENTO', 'FILHOS', 'HONRA', 'CUIDAR', 'LAR'] },
  { id: 'sabedoria', title: 'Sabedoria', subtitle: 'Direção, conselho e entendimento.', words: ['SABEDORIA', 'CONSELHO', 'ENTENDER', 'PRUDENCIA', 'VERDADE', 'CAMINHO'] },
  { id: 'esperanca', title: 'Esperança', subtitle: 'Temas de confiança e perseverança.', words: ['ESPERANCA', 'PROMESSA', 'FIRMEZA', 'CONFIANCA', 'DESCANSO', 'FUTURO'] },
  { id: 'reino', title: 'Reino', subtitle: 'Elementos do Reino de Deus.', words: ['REINO', 'JUSTICA', 'PAI', 'HERANCA', 'CIDADAO', 'ETERNO'] },
  { id: 'servico', title: 'Serviço', subtitle: 'Postura de quem serve com humildade.', words: ['SERVICO', 'HUMILDADE', 'AJUDA', 'ENTREGA', 'ZELAR', 'DIACONIA'] },
  { id: 'juventude', title: 'Juventude', subtitle: 'Vocabulário de identidade e propósito.', words: ['PROPOSITO', 'PUREZA', 'CORAGEM', 'ESCOLHA', 'CHAMADO', 'FIRME'] },
  { id: 'casa', title: 'Casa de Deus', subtitle: 'Elementos do culto e da reunião.', words: ['ALTAR', 'OFERTA', 'CULTO', 'PORTAS', 'TEMPLO', 'CORAL'] },
  { id: 'esperito', title: 'Vida no Espírito', subtitle: 'Sensibilidade e direção espiritual.', words: ['ESPIRITO', 'UNCAO', 'GUIA', 'CONSAGRAR', 'PRESENCA', 'SOPRO'] },
] as const;

const DIRECTIONS = [
  { row: 0, col: 1 },
  { row: 1, col: 0 },
  { row: 1, col: 1 },
  { row: -1, col: 1 },
  { row: 0, col: -1 },
  { row: -1, col: 0 },
  { row: -1, col: -1 },
  { row: 1, col: -1 },
] as const;

function getCellId(row: number, col: number) {
  return `${row}-${col}`;
}

function getStep(delta: number) {
  if (delta === 0) return 0;
  return delta > 0 ? 1 : -1;
}

function getLineCells(start: Cell, end: Cell) {
  const rowDelta = end.row - start.row;
  const colDelta = end.col - start.col;
  const absRow = Math.abs(rowDelta);
  const absCol = Math.abs(colDelta);

  const isHorizontal = rowDelta === 0;
  const isVertical = colDelta === 0;
  const isDiagonal = absRow === absCol;

  if (!isHorizontal && !isVertical && !isDiagonal) {
    return [start];
  }

  const rowStep = getStep(rowDelta);
  const colStep = getStep(colDelta);
  const length = Math.max(absRow, absCol) + 1;

  return Array.from({ length }, (_, index) => ({
    row: start.row + rowStep * index,
    col: start.col + colStep * index,
  }));
}

function cellsToIds(cells: Cell[]) {
  return cells.map((cell) => getCellId(cell.row, cell.col));
}

function samePath(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

function normalizeWord(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z]/gi, '')
    .toUpperCase();
}

function shuffle<T>(items: readonly T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function canPlaceWord(grid: (string | null)[][], word: string, start: Cell, direction: { row: number; col: number }) {
  for (let index = 0; index < word.length; index += 1) {
    const row = start.row + direction.row * index;
    const col = start.col + direction.col * index;
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return false;
    const current = grid[row][col];
    if (current && current !== word[index]) return false;
  }
  return true;
}

function placeWord(grid: (string | null)[][], word: string, start: Cell, direction: { row: number; col: number }) {
  for (let index = 0; index < word.length; index += 1) {
    const row = start.row + direction.row * index;
    const col = start.col + direction.col * index;
    grid[row][col] = word[index];
  }
}

function randomLetter() {
  return ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
}

function generatePuzzle(theme: ThemeDefinition) {
  const grid: (string | null)[][] = Array.from({ length: BOARD_SIZE }, () => Array.from({ length: BOARD_SIZE }, () => null));
  const placedWords: WordDefinition[] = [];
  const words = shuffle(theme.words)
    .map(normalizeWord)
    .filter(Boolean)
    .sort((left, right) => right.length - left.length)
    .slice(0, MAX_WORDS_PER_THEME);

  words.forEach((word, index) => {
    let placed = false;
    for (let attempt = 0; attempt < 300 && !placed; attempt += 1) {
      const direction = shuffle(DIRECTIONS)[0];
      const start = {
        row: Math.floor(Math.random() * BOARD_SIZE),
        col: Math.floor(Math.random() * BOARD_SIZE),
      };

      if (!canPlaceWord(grid, word, start, direction)) continue;

      placeWord(grid, word, start, direction);
      placedWords.push({
        id: `${theme.id}-${word.toLowerCase()}`,
        label: word,
        start,
        end: {
          row: start.row + direction.row * (word.length - 1),
          col: start.col + direction.col * (word.length - 1),
        },
        color: WORD_COLORS[index % WORD_COLORS.length],
      });
      placed = true;
    }
  });

  const filledGrid = grid.map((row) =>
    row.map((cell) => cell ?? randomLetter())
  ) as string[][];

  return {
    grid: filledGrid,
    words: placedWords,
  };
}

function getCellFromEvent(event: ReactTouchEvent<HTMLDivElement> | ReactMouseEvent<HTMLDivElement>): Cell | null {
  const touch = 'touches' in event ? event.touches[0] || event.changedTouches[0] : event;
  const element = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null;
  const cell = element?.closest('[data-r][data-c]') as HTMLElement | null;
  const row = cell?.getAttribute('data-r');
  const col = cell?.getAttribute('data-c');
  if (row === null || col === null || row === undefined || col === undefined) return null;
  return { row: Number(row), col: Number(col) };
}

export function WordSearch() {
  const [themeIndex, setThemeIndex] = useState(() => Math.floor(Math.random() * THEMES.length));
  const [selectionStart, setSelectionStart] = useState<Cell | null>(null);
  const [previewPath, setPreviewPath] = useState<string[]>([]);
  const [foundWordIds, setFoundWordIds] = useState<string[]>([]);
  const [lastFoundWordId, setLastFoundWordId] = useState<string | null>(null);

  const theme = THEMES[themeIndex];
  const puzzle = useMemo(() => generatePuzzle(theme), [theme]);

  const wordPaths = useMemo(() => {
    return puzzle.words.map((word) => ({
      ...word,
      path: cellsToIds(getLineCells(word.start, word.end)),
      reversePath: [...cellsToIds(getLineCells(word.start, word.end))].reverse(),
    }));
  }, [puzzle.words]);

  const foundWords = useMemo(
    () => wordPaths.filter((word) => foundWordIds.includes(word.id)),
    [foundWordIds, wordPaths]
  );

  const foundCellStyles = useMemo(() => {
    const entries = new Map<string, string>();
    foundWords.forEach((word) => {
      word.path.forEach((cellId) => {
        if (!entries.has(cellId)) {
          entries.set(cellId, word.color);
        }
      });
    });
    return entries;
  }, [foundWords]);

  useEffect(() => {
    setFoundWordIds([]);
    setLastFoundWordId(null);
    setSelectionStart(null);
    setPreviewPath([]);
  }, [themeIndex]);

  useEffect(() => {
    if (!lastFoundWordId) return;
    const timeout = window.setTimeout(() => setLastFoundWordId(null), 900);
    return () => window.clearTimeout(timeout);
  }, [lastFoundWordId]);

  const handleStart = useCallback((cell: Cell | null) => {
    if (!cell) return;
    setSelectionStart(cell);
    setPreviewPath([getCellId(cell.row, cell.col)]);
  }, []);

  const handleMove = useCallback((cell: Cell | null) => {
    if (!selectionStart || !cell) return;
    setPreviewPath(cellsToIds(getLineCells(selectionStart, cell)));
  }, [selectionStart]);

  const handleEnd = useCallback(() => {
    if (previewPath.length > 0) {
      const matchedWord = wordPaths.find((word) => {
        if (foundWordIds.includes(word.id)) return false;
        return samePath(previewPath, word.path) || samePath(previewPath, word.reversePath);
      });

      if (matchedWord) {
        setFoundWordIds((current) => [...current, matchedWord.id]);
        setLastFoundWordId(matchedWord.id);
      }
    }

    setSelectionStart(null);
    setPreviewPath([]);
  }, [foundWordIds, previewPath, wordPaths]);

  const goToNextTheme = () => {
    setThemeIndex((current) => (current + 1) % THEMES.length);
  };

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5 p-4">
      <div className="rounded-2xl border bg-card p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">{theme.title}</h2>
            <p className="text-sm text-muted-foreground">{theme.subtitle}</p>
            <p className="mt-1 text-xs text-muted-foreground">Clique e arraste em linha reta para selecionar.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {foundWordIds.length}/{wordPaths.length}
            </div>
            <button
              type="button"
              onClick={goToNextTheme}
              className="inline-flex h-9 items-center gap-2 rounded-full border px-3 text-xs font-medium transition-colors hover:border-primary/40 hover:text-primary"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Novo tema
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {wordPaths.map((word) => {
            const found = foundWordIds.includes(word.id);
            const justFound = lastFoundWordId === word.id;
            return (
              <div
                key={word.id}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-sm font-semibold transition-all',
                  found ? 'border-transparent bg-muted text-muted-foreground line-through' : 'border-border',
                  justFound && 'animate-bounce scale-105 shadow-sm'
                )}
              >
                {word.label}
              </div>
            );
          })}
        </div>
      </div>

      <div
        className="inline-grid w-full max-w-[min(100%,28rem)] touch-none select-none gap-1 rounded-2xl border bg-card p-2 mx-auto"
        style={{
          gridTemplateColumns: `repeat(${puzzle.grid[0].length}, minmax(0, 1fr))`,
        }}
        onMouseDown={(event) => handleStart(getCellFromEvent(event))}
        onMouseMove={(event) => {
          if (selectionStart) handleMove(getCellFromEvent(event));
        }}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={(event) => {
          event.preventDefault();
          handleStart(getCellFromEvent(event));
        }}
        onTouchMove={(event) => {
          event.preventDefault();
          handleMove(getCellFromEvent(event));
        }}
        onTouchEnd={handleEnd}
        onTouchCancel={handleEnd}
      >
        {puzzle.grid.map((row, rowIndex) =>
          row.map((letter, colIndex) => {
            const cellId = getCellId(rowIndex, colIndex);
            const foundClass = foundCellStyles.get(cellId);
            const inPreview = previewPath.includes(cellId);

            return (
              <div
                key={cellId}
                data-r={rowIndex}
                data-c={colIndex}
                className={cn(
                  'letter-cell touch-none',
                  foundClass
                    ? cn('word-found shadow-sm', foundClass)
                    : inPreview
                      ? 'word-selecting scale-105 border-primary text-primary'
                      : 'border-border bg-muted/50 text-foreground'
                )}
              >
                {letter}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
