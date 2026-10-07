import { useState, useCallback, useEffect, useRef } from "react";
import GameLayout from "@/features/new-games/components/GameLayout";
import { recordGameScore } from "@/services/engagement/engagement-api";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const WORD_SEARCH_PUZZLES = [
  {
    theme: "Personagens Biblicos",
    words: ["JESUS", "MOISES", "DAVI", "ABEL", "NOE", "SARA", "RUTE", "ESTER"],
    size: 10,
  },
  {
    theme: "Antigo Testamento",
    words: ["GENESIS", "EXODO", "LEVITICO", "NUMEROS", "DEUTERONOMIO", "JOSUE", "JUIZES", "RUTE"],
    size: 12,
  },
  {
    theme: "Novo Testamento",
    words: ["MATEUS", "MARCOS", "LUCAS", "JOAO", "ATOS", "ROMANOS", "EFESIOS", "APOCALIPSE"],
    size: 12,
  },
  {
    theme: "Discipulos",
    words: ["PEDRO", "TIAGO", "JOAO", "ANDRE", "FILIPE", "TOME", "MATEUS", "BARTOLOMEU"],
    size: 10,
  },
  {
    theme: "Mulheres da Biblia",
    words: ["MARIA", "MARTA", "ISABEL", "ANA", "DEBORA", "DALILA", "PRISCILA", "LIDIA"],
    size: 11,
  },
  {
    theme: "Milagres",
    words: ["CURA", "PAES", "PEIXES", "LEPROSO", "CEGO", "LAZARO", "TEMPESTADE", "VINHO"],
    size: 11,
  },
  {
    theme: "Lugares Biblicos",
    words: ["BELEM", "JERUSALEM", "NAZARE", "BETANIA", "GALILEIA", "JERICO", "EGITO", "SINAI"],
    size: 12,
  },
  {
    theme: "Objetos e Simbolos",
    words: ["ARCA", "TABUAS", "MANA", "FUNDA", "COROA", "ALTAR", "TROMBETA", "LAMPADA"],
    size: 11,
  },
  {
    theme: "Animais e Criacao",
    words: ["CORVO", "POMBA", "LEAO", "CORDEIRO", "PEIXE", "FORMIGA", "CAMELO", "JUMENTO"],
    size: 11,
  },
  {
    theme: "Virtudes Cristas",
    words: ["AMOR", "FE", "GRACA", "PERDAO", "BONDADE", "JUSTICA", "PAZ", "ESPERANCA"],
    size: 11,
  },
];

type Dir = [number, number];
const DIRS: Dir[] = [[0,1],[1,0],[1,1],[0,-1],[-1,0],[-1,-1],[1,-1],[-1,1]];
export type WordPlacement = { word: string; cells: [number, number][] };
export const WORD_SEARCH_POINTS_PER_WORD = 10;
export const WORD_SEARCH_MAX_TIME_BONUS = 40;

const shuffle = <T,>(items: T[]) => {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled;
};

const getCandidates = (word: string, size: number) => {
  const candidates: WordPlacement[] = [];

  for (const [rowDirection, columnDirection] of DIRS) {
    for (let row = 0; row < size; row++) {
      for (let column = 0; column < size; column++) {
        const endRow = row + rowDirection * (word.length - 1);
        const endColumn = column + columnDirection * (word.length - 1);

        if (endRow < 0 || endRow >= size || endColumn < 0 || endColumn >= size) continue;

        candidates.push({
          word,
          cells: Array.from({ length: word.length }, (_, index) => [
            row + rowDirection * index,
            column + columnDirection * index,
          ] as [number, number]),
        });
      }
    }
  }

  return candidates;
};

/**
 * Creates a complete puzzle or fails explicitly. We never return a word in the
 * list without a corresponding placement in the board.
 */
export function createWordSearchGrid(words: string[], size: number) {
  const orderedWords = [...words].sort((first, second) => second.length - first.length);

  for (let generationAttempt = 0; generationAttempt < 80; generationAttempt++) {
  const grid: string[][] = Array.from({ length: size }, () => Array(size).fill(""));
    const placements: WordPlacement[] = [];
    let complete = true;

    for (const word of orderedWords) {
      const placement = shuffle(getCandidates(word, size)).find(({ cells }) =>
        cells.every(([row, column], index) => grid[row][column] === "" || grid[row][column] === word[index]),
      );

      if (!placement) {
        complete = false;
        break;
      }

      placement.cells.forEach(([row, column], index) => {
        grid[row][column] = word[index];
      });
      placements.push(placement);
    }

    if (!complete) continue;

    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (let row = 0; row < size; row++) {
      for (let column = 0; column < size; column++) {
        if (grid[row][column] === "") grid[row][column] = letters[Math.floor(Math.random() * letters.length)];
      }
    }

    return { grid, placements };
  }

  throw new Error("Não foi possível gerar um caça-palavras completo.");
}

const WordSearchGame = () => {
  const [puzzle] = useState(() => WORD_SEARCH_PUZZLES[Math.floor(Math.random() * WORD_SEARCH_PUZZLES.length)]);
  const [{ grid, placements }] = useState(() => createWordSearchGrid(puzzle.words, puzzle.size));
  const [foundWords, setFoundWords] = useState<Set<string>>(new Set());
  const [selecting, setSelecting] = useState<[number, number][]>([]);
  const [startCell, setStartCell] = useState<[number, number] | null>(null);
  const [showGiveUpConfirm, setShowGiveUpConfirm] = useState(false);
  const [gaveUp, setGaveUp] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [completedScore, setCompletedScore] = useState<number | null>(null);
  const [runId] = useState(() => `word-search-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const gridRef = useRef<HTMLDivElement>(null);

  const foundCells = new Set<string>();
  placements.forEach(p => {
    if (foundWords.has(p.word)) p.cells.forEach(([r, c]) => foundCells.add(`${r},${c}`));
  });

  const selectingSet = new Set(selecting.map(([r, c]) => `${r},${c}`));
  const potentialScore = puzzle.words.length * WORD_SEARCH_POINTS_PER_WORD
    + Math.max(0, WORD_SEARCH_MAX_TIME_BONUS - elapsedSeconds);

  const getCellFromEvent = (e: React.TouchEvent | React.MouseEvent): [number, number] | null => {
    const touch = "touches" in e ? e.touches[0] || e.changedTouches[0] : e;
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!el) return null;
    const r = el.getAttribute("data-r");
    const c = el.getAttribute("data-c");
    if (r === null || c === null) return null;
    return [parseInt(r), parseInt(c)];
  };

  const computeLine = (start: [number, number], end: [number, number]): [number, number][] => {
    const rowDifference = end[0] - start[0];
    const columnDifference = end[1] - start[1];
    const rowDistance = Math.abs(rowDifference);
    const columnDistance = Math.abs(columnDifference);

    if (rowDistance === 0 && columnDistance === 0) return [start];

    // A finger rarely finishes in the exact cell diagonal. Snap to the closest
    // valid word-search direction instead of producing a non-linear path.
    const isMostlyVertical = rowDistance > columnDistance * 2;
    const isMostlyHorizontal = columnDistance > rowDistance * 2;
    const dr = isMostlyHorizontal ? 0 : Math.sign(rowDifference);
    const dc = isMostlyVertical ? 0 : Math.sign(columnDifference);
    const len = isMostlyVertical ? rowDistance : isMostlyHorizontal ? columnDistance : Math.min(rowDistance, columnDistance);
    const cells: [number, number][] = [];
    for (let i = 0; i <= len; i++) cells.push([start[0] + dr * i, start[1] + dc * i]);
    return cells;
  };

  const handleStart = useCallback((cell: [number, number] | null) => {
    if (!cell) return;
    setStartCell(cell);
    setSelecting([cell]);
  }, []);

  const handleMove = useCallback((cell: [number, number] | null) => {
    if (!startCell || !cell) return;
    setSelecting(computeLine(startCell, cell));
  }, [startCell]);

  const handleEnd = useCallback(() => {
    if (selecting.length > 0) {
      const selectedWord = selecting.map(([r, c]) => grid[r][c]).join("");
      const reversedWord = [...selectedWord].reverse().join("");
      for (const p of placements) {
        if ((p.word === selectedWord || p.word === reversedWord) && !foundWords.has(p.word)) {
          const nextFoundWords = new Set([...foundWords, p.word]);
          setFoundWords(nextFoundWords);
          if (nextFoundWords.size === puzzle.words.length) {
            setCompletedScore(potentialScore);
          }
          break;
        }
      }
    }
    setSelecting([]);
    setStartCell(null);
  }, [selecting, grid, placements, foundWords, potentialScore, puzzle.words.length]);

  const handleGiveUp = () => {
    setFoundWords(new Set(puzzle.words));
    setSelecting([]);
    setStartCell(null);
    setGaveUp(true);
    setShowGiveUpConfirm(false);
  };

  const allFound = !gaveUp && foundWords.size === puzzle.words.length;

  useEffect(() => {
    if (allFound || gaveUp) return;
    const interval = window.setInterval(() => setElapsedSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, [allFound, gaveUp]);

  useEffect(() => {
    if (completedScore === null || gaveUp) return;
    void recordGameScore({ gameId: 'caca-palavras', runId, score: completedScore });
  }, [completedScore, gaveUp, runId]);

  return (
    <GameLayout title="Caça-Palavras" emoji="🔍">
      <div className="mb-3 text-center">
        <p className="font-display text-lg font-bold">{puzzle.theme}</p>
        <p className="text-sm text-muted-foreground">Encontre todas as palavras do tema sorteado.</p>
      </div>

      <div className="mb-3 flex items-center justify-between rounded-lg bg-secondary/70 px-3 py-2 text-sm font-semibold text-secondary-foreground">
        <span>{foundWords.size}/{puzzle.words.length} encontradas</span>
        <span>{gaveUp ? 'Sem pontuação' : `⭐ ${allFound ? completedScore : potentialScore} pts`}</span>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {puzzle.words.map(w => (
          <span key={w} className={`rounded-md px-2 py-1 text-sm font-semibold transition-colors ${foundWords.has(w) ? "border border-primary bg-primary text-primary-foreground line-through" : "bg-secondary text-secondary-foreground"}`}>
            {w}
          </span>
        ))}
      </div>

      {!gaveUp && !allFound && (
        <div className="mb-4 flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setShowGiveUpConfirm(true)}>
            Desistir e revelar palavras
          </Button>
        </div>
      )}

      {allFound && (
        <div className="text-center mb-4 animate-bounce-in">
          <p className="text-xl font-display font-bold text-game-success">🎉 Parabéns! Todas encontradas!</p>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">{completedScore} pontos adicionados ao ranking.</p>
        </div>
      )}

      {gaveUp && (
        <p className="mb-4 text-center text-sm text-muted-foreground">
          Respostas reveladas. Tente novamente em uma nova partida quando quiser.
        </p>
      )}

      <div
        ref={gridRef}
        className="grid w-full max-w-[28rem] touch-none select-none grid-cols-[repeat(var(--board-size),minmax(0,1fr))] gap-0.5 rounded-xl bg-game-surface p-1 sm:p-2"
        style={{ "--board-size": puzzle.size } as React.CSSProperties}
        onMouseDown={(e) => handleStart(getCellFromEvent(e))}
        onMouseMove={(e) => { if (startCell) handleMove(getCellFromEvent(e)); }}
        onMouseUp={handleEnd}
        onTouchStart={(e) => { e.preventDefault(); handleStart(getCellFromEvent(e)); }}
        onTouchMove={(e) => { e.preventDefault(); handleMove(getCellFromEvent(e)); }}
        onTouchEnd={handleEnd}
      >
        {grid.map((row, r) =>
          row.map((letter, c) => {
            const key = `${r},${c}`;
            const isFound = foundCells.has(key);
            const isSelecting = selectingSet.has(key);
            return (
                <div
                  key={key}
                  data-r={r}
                  data-c={c}
                  className={`letter-cell ${isFound ? "word-found" : isSelecting ? "word-selecting" : "bg-card"}`}
                >
                {letter}
              </div>
            );
          })
        )}
      </div>

      <AlertDialog open={showGiveUpConfirm} onOpenChange={setShowGiveUpConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revelar as palavras?</AlertDialogTitle>
            <AlertDialogDescription>
              A partida será encerrada e todas as palavras serão destacadas no tabuleiro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar jogando</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleGiveUp}>
              Desistir e revelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </GameLayout>
  );
};

export default WordSearchGame;
