import { useState, useRef, useEffect } from "react";
import GameLayout from "@/features/new-games/components/GameLayout";

interface CrosswordClue {
  number: number;
  word: string;
  clue: string;
  row: number;
  col: number;
  direction: "across" | "down";
}

const CLUES: CrosswordClue[] = [
  { number: 1, word: "JESUS", clue: "Filho de Deus", row: 0, col: 0, direction: "across" },
  { number: 2, word: "JOAO", clue: "Apóstolo amado", row: 0, col: 0, direction: "down" },
  { number: 3, word: "EVA", clue: "Primeira mulher criada por Deus", row: 2, col: 2, direction: "across" },
  { number: 4, word: "SARA", clue: "Esposa de Abraão", row: 0, col: 4, direction: "down" },
  { number: 5, word: "ABEL", clue: "Filho de Adão, pastor de ovelhas", row: 4, col: 1, direction: "across" },
];

const GRID_SIZE = 6;

const CrosswordGame = () => {
  const [grid, setGrid] = useState<string[][]>(() =>
    Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(""))
  );
  const [solved, setSolved] = useState(false);
  const [selectedClue, setSelectedClue] = useState<number | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[][]>(
    Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null))
  );

  // Build solution grid & clue number map
  const solution: (string | null)[][] = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
  const cellNumbers: (number | null)[][] = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));

  CLUES.forEach(clue => {
    cellNumbers[clue.row][clue.col] = clue.number;
    for (let i = 0; i < clue.word.length; i++) {
      const r = clue.direction === "down" ? clue.row + i : clue.row;
      const c = clue.direction === "across" ? clue.col + i : clue.col;
      if (r < GRID_SIZE && c < GRID_SIZE) solution[r][c] = clue.word[i];
    }
  });

  // Cells belonging to selected clue
  const highlightedCells = new Set<string>();
  if (selectedClue !== null) {
    const clue = CLUES.find(c => c.number === selectedClue);
    if (clue) {
      for (let i = 0; i < clue.word.length; i++) {
        const r = clue.direction === "down" ? clue.row + i : clue.row;
        const c = clue.direction === "across" ? clue.col + i : clue.col;
        highlightedCells.add(`${r},${c}`);
      }
    }
  }

  const handleInput = (r: number, c: number, value: string) => {
    const letter = value.toUpperCase().slice(-1);
    setGrid(prev => {
      const g = prev.map(row => [...row]);
      g[r][c] = letter;
      return g;
    });
    setSolved(false);

    // Auto-advance to next cell in direction
    if (letter && selectedClue !== null) {
      const clue = CLUES.find(cl => cl.number === selectedClue);
      if (clue) {
        const nr = clue.direction === "down" ? r + 1 : r;
        const nc = clue.direction === "across" ? c + 1 : c;
        if (nr < GRID_SIZE && nc < GRID_SIZE && solution[nr][nc] !== null) {
          inputRefs.current[nr]?.[nc]?.focus();
        }
      }
    }
  };

  const handleCellClick = (r: number, c: number) => {
    // Find clues that contain this cell
    const matching = CLUES.filter(clue => {
      for (let i = 0; i < clue.word.length; i++) {
        const cr = clue.direction === "down" ? clue.row + i : clue.row;
        const cc = clue.direction === "across" ? clue.col + i : clue.col;
        if (cr === r && cc === c) return true;
      }
      return false;
    });
    if (matching.length > 0) {
      const current = matching.find(m => m.number === selectedClue);
      const next = current ? matching[(matching.indexOf(current) + 1) % matching.length] : matching[0];
      setSelectedClue(next.number);
    }
  };

  const checkSolution = () => {
    let correct = true;
    for (let r = 0; r < GRID_SIZE; r++)
      for (let c = 0; c < GRID_SIZE; c++)
        if (solution[r][c] && grid[r][c] !== solution[r][c]) correct = false;
    setSolved(correct);
  };

  return (
    <GameLayout title="Palavras Cruzadas" emoji="📝">
      <div className="grid gap-0.5 mx-auto mb-4" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 44px))`, width: "fit-content" }}>
        {solution.map((row, r) =>
          row.map((cell, c) => (
            <div key={`${r}-${c}`} className="relative">
              {cell !== null ? (
                <>
                  {cellNumbers[r][c] && (
                    <span className="absolute top-0 left-0.5 text-[9px] font-bold text-primary z-10 leading-none">
                      {cellNumbers[r][c]}
                    </span>
                  )}
                  <input
                    ref={el => {
                      if (!inputRefs.current[r]) inputRefs.current[r] = [];
                      inputRefs.current[r][c] = el;
                    }}
                    type="text"
                    maxLength={1}
                    value={grid[r][c]}
                    onChange={e => handleInput(r, c, e.target.value)}
                    onClick={() => handleCellClick(r, c)}
                    className={`w-10 h-10 sm:w-11 sm:h-11 text-center text-lg font-bold border-2 rounded-md font-body uppercase transition-colors ${
                      solved ? "border-game-success bg-game-success/10" :
                      highlightedCells.has(`${r},${c}`) ? "border-primary bg-primary/10" :
                      "border-border bg-card"
                    }`}
                  />
                </>
              ) : (
                <div className="w-10 h-10 sm:w-11 sm:h-11 bg-foreground/10 rounded-md" />
              )}
            </div>
          ))
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div>
          <h3 className="font-display text-sm font-bold text-primary mb-1">→ Horizontal</h3>
          {CLUES.filter(c => c.direction === "across").map(clue => (
            <button
              key={clue.number}
              onClick={() => {
                setSelectedClue(clue.number);
                inputRefs.current[clue.row]?.[clue.col]?.focus();
              }}
              className={`block w-full text-left text-sm py-1 px-2 rounded transition-colors ${
                selectedClue === clue.number ? "bg-primary/10 text-primary font-semibold" : "text-foreground hover:bg-secondary"
              }`}
            >
              <span className="font-bold">{clue.number}.</span> {clue.clue}
            </button>
          ))}
        </div>
        <div>
          <h3 className="font-display text-sm font-bold text-primary mb-1">↓ Vertical</h3>
          {CLUES.filter(c => c.direction === "down").map(clue => (
            <button
              key={clue.number}
              onClick={() => {
                setSelectedClue(clue.number);
                inputRefs.current[clue.row]?.[clue.col]?.focus();
              }}
              className={`block w-full text-left text-sm py-1 px-2 rounded transition-colors ${
                selectedClue === clue.number ? "bg-primary/10 text-primary font-semibold" : "text-foreground hover:bg-secondary"
              }`}
            >
              <span className="font-bold">{clue.number}.</span> {clue.clue}
            </button>
          ))}
        </div>
      </div>

      {solved ? (
        <div className="text-center animate-bounce-in">
          <p className="text-xl font-display font-bold text-game-success">🎉 Perfeito!</p>
        </div>
      ) : (
        <button onClick={checkSolution} className="btn-game w-full">Verificar</button>
      )}
    </GameLayout>
  );
};

export default CrosswordGame;
