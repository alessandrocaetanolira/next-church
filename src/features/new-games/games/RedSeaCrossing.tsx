import { useState, useEffect, useCallback } from "react";
import GameLayout from "@/features/new-games/components/GameLayout";

const GRID_W = 7;
const GRID_H = 10;

type Cell = "water" | "path" | "wall" | "player" | "exit" | "enemy" | "manna";

function generateMaze(): Cell[][] {
  const grid: Cell[][] = Array.from({ length: GRID_H }, () =>
    Array.from({ length: GRID_W }, () => "water")
  );

  // Carve path from bottom to top
  let x = Math.floor(GRID_W / 2);
  grid[GRID_H - 1][x] = "path";

  for (let y = GRID_H - 2; y >= 0; y--) {
    grid[y][x] = "path";
    // Random horizontal moves
    const moves = Math.floor(Math.random() * 3);
    for (let m = 0; m < moves; m++) {
      const dir = Math.random() > 0.5 ? 1 : -1;
      const nx = x + dir;
      if (nx >= 0 && nx < GRID_W) {
        grid[y][nx] = "path";
        x = nx;
      }
    }
    // Add extra paths
    if (Math.random() > 0.5) {
      const ex = Math.floor(Math.random() * GRID_W);
      grid[y][ex] = "path";
    }
  }

  // Add enemies (Egyptian soldiers)
  let enemies = 0;
  for (let y = 1; y < GRID_H - 1; y++) {
    for (let xx = 0; xx < GRID_W; xx++) {
      if (grid[y][xx] === "path" && Math.random() < 0.08 && enemies < 4) {
        grid[y][xx] = "enemy";
        enemies++;
      }
    }
  }

  // Add manna
  for (let y = 1; y < GRID_H - 1; y++) {
    for (let xx = 0; xx < GRID_W; xx++) {
      if (grid[y][xx] === "path" && Math.random() < 0.06) {
        grid[y][xx] = "manna";
      }
    }
  }

  // Exit at top
  const exitX = grid[0].findIndex(c => c === "path");
  if (exitX >= 0) grid[0][exitX] = "exit";
  else { grid[0][Math.floor(GRID_W / 2)] = "exit"; }

  return grid;
}

const RedSeaCrossing = () => {
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [playerPos, setPlayerPos] = useState({ x: 0, y: 0 });
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [won, setWon] = useState(false);
  const [dead, setDead] = useState(false);
  const [lives, setLives] = useState(3);
  const [started, setStarted] = useState(false);

  const initLevel = useCallback(() => {
    const newGrid = generateMaze();
    setGrid(newGrid);
    // Find start position (bottom center path)
    const startX = Math.floor(GRID_W / 2);
    setPlayerPos({ x: startX, y: GRID_H - 1 });
    setWon(false);
    setDead(false);
  }, []);

  useEffect(() => {
    if (started) initLevel();
  }, [started, initLevel]);

  const move = useCallback((dx: number, dy: number) => {
    if (won || dead) return;
    const nx = playerPos.x + dx;
    const ny = playerPos.y + dy;
    if (nx < 0 || nx >= GRID_W || ny < 0 || ny >= GRID_H) return;

    const cell = grid[ny][nx];
    if (cell === "water") return;

    if (cell === "enemy") {
      setLives(l => {
        if (l <= 1) { setDead(true); return 0; }
        return l - 1;
      });
      setGrid(prev => {
        const g = prev.map(r => [...r]);
        g[ny][nx] = "path";
        return g;
      });
    }

    if (cell === "manna") {
      setScore(s => s + 15);
      setGrid(prev => {
        const g = prev.map(r => [...r]);
        g[ny][nx] = "path";
        return g;
      });
    }

    if (cell === "exit") {
      setScore(s => s + 50);
      setWon(true);
    }

    setPlayerPos({ x: nx, y: ny });
  }, [playerPos, grid, won, dead]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "w") move(0, -1);
      if (e.key === "ArrowDown" || e.key === "s") move(0, 1);
      if (e.key === "ArrowLeft" || e.key === "a") move(-1, 0);
      if (e.key === "ArrowRight" || e.key === "d") move(1, 0);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [move]);

  const nextLevel = () => {
    setLevel(l => l + 1);
    initLevel();
  };

  if (!started) {
    return (
      <GameLayout title="Travessia do Mar" emoji="🌊">
        <div className="text-center mt-10 animate-fade-in">
          <div className="text-6xl mb-4">🌊</div>
          <p className="font-display text-xl font-bold mb-2">Travessia do Mar Vermelho</p>
          <p className="text-muted-foreground text-sm mb-6">
            Guie o povo pelo caminho aberto no mar!<br/>
            Desvie dos soldados egípcios 🗡️ e colete maná 🍞
          </p>
          <button onClick={() => setStarted(true)} className="btn-game text-lg px-8 py-3">🌊 Atravessar!</button>
        </div>
      </GameLayout>
    );
  }

  if (dead) {
    return (
      <GameLayout title="Travessia do Mar" emoji="🌊">
        <div className="text-center mt-10 animate-fade-in">
          <div className="text-6xl mb-4">💀</div>
          <p className="font-display text-2xl font-bold">Capturado!</p>
          <p className="text-muted-foreground mt-2">Nível: {level} • Pontos: {score}</p>
          <button onClick={() => { setLives(3); setScore(0); setLevel(1); initLevel(); }}
            className="btn-game mt-6">Tentar Novamente</button>
        </div>
      </GameLayout>
    );
  }

  if (won) {
    return (
      <GameLayout title="Travessia do Mar" emoji="🌊">
        <div className="text-center mt-10 animate-fade-in">
          <div className="text-6xl mb-4">🌟</div>
          <p className="font-display text-2xl font-bold">Nível {level} completo!</p>
          <p className="text-muted-foreground mt-2">Pontos: {score} • Vidas: {"❤️".repeat(lives)}</p>
          <button onClick={nextLevel} className="btn-game mt-6">Próximo Nível →</button>
        </div>
      </GameLayout>
    );
  }

  return (
    <GameLayout title="Travessia do Mar" emoji="🌊">
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm">{"❤️".repeat(lives)}{"🖤".repeat(3 - lives)}</span>
        <span className="text-sm font-semibold">Nível {level}</span>
        <span className="text-sm font-semibold bg-accent/20 px-3 py-1 rounded-full">⭐ {score}</span>
      </div>

      <div className="flex justify-center">
        <div className="grid gap-0.5 bg-blue-400/30 dark:bg-blue-900/50 p-1 rounded-xl"
          style={{ gridTemplateColumns: `repeat(${GRID_W}, 1fr)` }}>
          {grid.map((row, y) =>
            row.map((cell, x) => {
              const isPlayer = playerPos.x === x && playerPos.y === y;
              let emoji = "";
              let bg = "bg-blue-500/40 dark:bg-blue-800/60";

              if (cell === "path") { bg = "bg-amber-200/80 dark:bg-amber-900/60"; }
              if (cell === "exit") { bg = "bg-primary/20"; emoji = "🏁"; }
              if (cell === "enemy") { bg = "bg-amber-200/80 dark:bg-amber-900/60"; emoji = "🗡️"; }
              if (cell === "manna") { bg = "bg-amber-200/80 dark:bg-amber-900/60"; emoji = "🍞"; }
              if (isPlayer) { bg = "bg-primary/30"; emoji = "🧔"; }

              return (
                <div key={`${x}-${y}`}
                  className={`w-[min(11vw,2.8rem)] h-[min(11vw,2.8rem)] ${bg} rounded flex items-center justify-center text-lg`}
                  onClick={() => {
                    const dx = x - playerPos.x;
                    const dy = y - playerPos.y;
                    if (Math.abs(dx) + Math.abs(dy) === 1) move(dx, dy);
                  }}
                >
                  {emoji}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* D-pad */}
      <div className="grid grid-cols-3 gap-1 max-w-[160px] mx-auto mt-4">
        <div />
        <button onClick={() => move(0, -1)} className="btn-game py-2 text-lg">⬆️</button>
        <div />
        <button onClick={() => move(-1, 0)} className="btn-game py-2 text-lg">⬅️</button>
        <div />
        <button onClick={() => move(1, 0)} className="btn-game py-2 text-lg">➡️</button>
        <div />
        <button onClick={() => move(0, 1)} className="btn-game py-2 text-lg">⬇️</button>
        <div />
      </div>
    </GameLayout>
  );
};

export default RedSeaCrossing;
