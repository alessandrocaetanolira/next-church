import { useState, useCallback, useRef } from "react";
import GameLayout from "@/features/new-games/components/GameLayout";

const PUZZLES = [
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

function createGrid(words: string[], size: number) {
  const grid: string[][] = Array.from({ length: size }, () => Array(size).fill(""));
  const placements: { word: string; cells: [number, number][] }[] = [];

  for (const word of words) {
    let placed = false;
    for (let attempts = 0; attempts < 200 && !placed; attempts++) {
      const dir = DIRS[Math.floor(Math.random() * DIRS.length)];
      const r = Math.floor(Math.random() * size);
      const c = Math.floor(Math.random() * size);
      const cells: [number, number][] = [];
      let ok = true;
      for (let i = 0; i < word.length; i++) {
        const nr = r + dir[0] * i;
        const nc = c + dir[1] * i;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) { ok = false; break; }
        if (grid[nr][nc] !== "" && grid[nr][nc] !== word[i]) { ok = false; break; }
        cells.push([nr, nc]);
      }
      if (ok) {
        cells.forEach(([cr, cc], i) => { grid[cr][cc] = word[i]; });
        placements.push({ word, cells });
        placed = true;
      }
    }
  }

  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (grid[r][c] === "") grid[r][c] = letters[Math.floor(Math.random() * 26)];

  return { grid, placements };
}

const WordSearchGame = () => {
  const [puzzle] = useState(() => PUZZLES[Math.floor(Math.random() * PUZZLES.length)]);
  const [{ grid, placements }] = useState(() => createGrid(puzzle.words, puzzle.size));
  const [foundWords, setFoundWords] = useState<Set<string>>(new Set());
  const [selecting, setSelecting] = useState<[number, number][]>([]);
  const [startCell, setStartCell] = useState<[number, number] | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const foundCells = new Set<string>();
  placements.forEach(p => {
    if (foundWords.has(p.word)) p.cells.forEach(([r, c]) => foundCells.add(`${r},${c}`));
  });

  const selectingSet = new Set(selecting.map(([r, c]) => `${r},${c}`));

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
    const dr = Math.sign(end[0] - start[0]);
    const dc = Math.sign(end[1] - start[1]);
    if (dr === 0 && dc === 0) return [start];
    const len = Math.max(Math.abs(end[0] - start[0]), Math.abs(end[1] - start[1]));
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
          setFoundWords(prev => new Set([...prev, p.word]));
          break;
        }
      }
    }
    setSelecting([]);
    setStartCell(null);
  }, [selecting, grid, placements, foundWords]);

  const allFound = foundWords.size === puzzle.words.length;

  return (
    <GameLayout title="Caça-Palavras" emoji="🔍">
      <div className="mb-3 text-center">
        <p className="font-display text-lg font-bold">{puzzle.theme}</p>
        <p className="text-sm text-muted-foreground">Encontre todas as palavras do tema sorteado.</p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {puzzle.words.map(w => (
          <span key={w} className={`text-sm font-semibold px-2 py-1 rounded-md ${foundWords.has(w) ? "bg-game-highlight line-through opacity-60" : "bg-secondary"}`}>
            {w}
          </span>
        ))}
      </div>

      {allFound && (
        <div className="text-center mb-4 animate-bounce-in">
          <p className="text-xl font-display font-bold text-game-success">🎉 Parabéns! Todas encontradas!</p>
        </div>
      )}

      <div
        ref={gridRef}
        className="inline-grid gap-0.5 bg-game-surface p-1 sm:p-2 rounded-xl mx-auto select-none touch-none w-full max-w-[min(100%,28rem)]"
        style={{ gridTemplateColumns: `repeat(${puzzle.size}, 1fr)` }}
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
    </GameLayout>
  );
};

export default WordSearchGame;
