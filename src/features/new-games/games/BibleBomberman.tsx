import { useState, useEffect, useRef, useCallback } from "react";
import GameLayout from "@/features/new-games/components/GameLayout";

type Pos = { x: number; y: number };
type Cell = "empty" | "wall" | "brick" | "bomb" | "fire" | "powerup";
type Difficulty = "easy" | "medium" | "hard";

const GRID = 11;
const BIBLE_ENEMIES = [
  { emoji: "👹", name: "Golias" },
  { emoji: "🐍", name: "Serpente" },
  { emoji: "🦁", name: "Leão" },
  { emoji: "🦂", name: "Escorpião" },
];

const POWERUPS = [
  { emoji: "🔥", type: "range", name: "Fogo de Elias" },
  { emoji: "💣", type: "bombs", name: "Mais bombas" },
  { emoji: "⚡", type: "speed", name: "Velocidade" },
  { emoji: "🛡️", type: "shield", name: "Escudo de Fé" },
];

const DIFF_CONFIG: Record<Difficulty, { enemies: number; bricks: number; speed: number; enemySpeed: number; label: string }> = {
  easy: { enemies: 2, bricks: 15, speed: 200, enemySpeed: 800, label: "Fácil" },
  medium: { enemies: 4, bricks: 20, speed: 180, enemySpeed: 600, label: "Médio" },
  hard: { enemies: 6, bricks: 25, speed: 150, enemySpeed: 400, label: "Difícil" },
};

interface Enemy {
  pos: Pos;
  emoji: string;
  name: string;
  alive: boolean;
}

interface Bomb {
  pos: Pos;
  timer: number;
  range: number;
}

const BibleBomberman = () => {
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [player, setPlayer] = useState<Pos>({ x: 1, y: 1 });
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [bombs, setBombs] = useState<Bomb[]>([]);
  const [fires, setFires] = useState<Pos[]>([]);
  const [alive, setAlive] = useState(true);
  const [score, setScore] = useState(0);
  const [bombRange, setBombRange] = useState(2);
  const [maxBombs, setMaxBombs] = useState(1);
  const [shield, setShield] = useState(false);
  const [level, setLevel] = useState(1);
  const [won, setWon] = useState(false);
  const [powerupCells, setPowerupCells] = useState<(Pos & { emoji: string; type: string })[]>([]);
  const touchStart = useRef<Pos | null>(null);

  const initLevel = useCallback((diff: Difficulty, lvl: number) => {
    const cfg = DIFF_CONFIG[diff];
    const g: Cell[][] = Array.from({ length: GRID }, () => Array(GRID).fill("empty"));
    
    // Walls (fixed pattern)
    for (let y = 0; y < GRID; y++)
      for (let x = 0; x < GRID; x++) {
        if (y === 0 || y === GRID - 1 || x === 0 || x === GRID - 1) g[y][x] = "wall";
        else if (y % 2 === 0 && x % 2 === 0) g[y][x] = "wall";
      }

    // Clear player spawn area
    const safe = new Set(["1,1", "2,1", "1,2"]);

    // Bricks
    const brickCount = Math.min(cfg.bricks + lvl * 2, 35);
    let placed = 0;
    while (placed < brickCount) {
      const x = 1 + Math.floor(Math.random() * (GRID - 2));
      const y = 1 + Math.floor(Math.random() * (GRID - 2));
      if (g[y][x] === "empty" && !safe.has(`${x},${y}`)) {
        g[y][x] = "brick";
        placed++;
      }
    }

    // Enemies
    const ens: Enemy[] = [];
    const enemyCount = cfg.enemies + Math.floor(lvl / 2);
    while (ens.length < enemyCount) {
      const x = 1 + Math.floor(Math.random() * (GRID - 2));
      const y = 1 + Math.floor(Math.random() * (GRID - 2));
      if (g[y][x] === "empty" && !safe.has(`${x},${y}`) && !ens.some(e => e.pos.x === x && e.pos.y === y)) {
        const template = BIBLE_ENEMIES[Math.floor(Math.random() * BIBLE_ENEMIES.length)];
        ens.push({ pos: { x, y }, ...template, alive: true });
      }
    }

    setGrid(g);
    setPlayer({ x: 1, y: 1 });
    setEnemies(ens);
    setBombs([]);
    setFires([]);
    setAlive(true);
    setWon(false);
    setPowerupCells([]);
    setScore(s => diff === difficulty ? s : 0);
  }, [difficulty]);

  const startGame = (diff: Difficulty) => {
    setDifficulty(diff);
    setLevel(1);
    setScore(0);
    setBombRange(2);
    setMaxBombs(1);
    setShield(false);
    initLevel(diff, 1);
  };

  // Move player
  const movePlayer = useCallback((dx: number, dy: number) => {
    if (!alive || won) return;
    setPlayer(prev => {
      const nx = prev.x + dx;
      const ny = prev.y + dy;
      if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID) return prev;
      if (grid[ny]?.[nx] === "wall" || grid[ny]?.[nx] === "brick") return prev;
      if (bombs.some(b => b.pos.x === nx && b.pos.y === ny)) return prev;

      // Check powerup
      const pu = powerupCells.find(p => p.x === nx && p.y === ny);
      if (pu) {
        if (pu.type === "range") setBombRange(r => r + 1);
        else if (pu.type === "bombs") setMaxBombs(m => m + 1);
        else if (pu.type === "shield") setShield(true);
        setScore(s => s + 50);
        setPowerupCells(prev => prev.filter(p => !(p.x === nx && p.y === ny)));
      }

      // Check enemy collision
      if (enemies.some(e => e.alive && e.pos.x === nx && e.pos.y === ny)) {
        if (shield) setShield(false);
        else setAlive(false);
      }

      return { x: nx, y: ny };
    });
  }, [alive, won, grid, bombs, enemies, powerupCells, shield]);

  // Place bomb
  const placeBomb = useCallback(() => {
    if (!alive || won) return;
    const activeBombs = bombs.length;
    if (activeBombs >= maxBombs) return;
    if (bombs.some(b => b.pos.x === player.x && b.pos.y === player.y)) return;
    setBombs(prev => [...prev, { pos: { ...player }, timer: 3, range: bombRange }]);
  }, [alive, won, bombs, maxBombs, player, bombRange]);

  // Keyboard
  useEffect(() => {
    if (!alive || won || !difficulty) return;
    const handle = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowUp": case "w": movePlayer(0, -1); break;
        case "ArrowDown": case "s": movePlayer(0, 1); break;
        case "ArrowLeft": case "a": movePlayer(-1, 0); break;
        case "ArrowRight": case "d": movePlayer(1, 0); break;
        case " ": e.preventDefault(); placeBomb(); break;
      }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [alive, won, difficulty, movePlayer, placeBomb]);

  // Bomb timer & explosions
  useEffect(() => {
    if (!alive || won || bombs.length === 0) return;
    const tick = setInterval(() => {
      setBombs(prev => {
        const exploding = prev.filter(b => b.timer <= 1);
        const remaining = prev.filter(b => b.timer > 1).map(b => ({ ...b, timer: b.timer - 1 }));

        if (exploding.length > 0) {
          const newFires: Pos[] = [];
          const newGrid = grid.map(row => [...row]);
          const newPowerups: (Pos & { emoji: string; type: string })[] = [];

          exploding.forEach(bomb => {
            newFires.push(bomb.pos);
            const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
            dirs.forEach(([ddx, ddy]) => {
              for (let i = 1; i <= bomb.range; i++) {
                const fx = bomb.pos.x + ddx * i;
                const fy = bomb.pos.y + ddy * i;
                if (fx < 0 || fx >= GRID || fy < 0 || fy >= GRID) break;
                if (newGrid[fy][fx] === "wall") break;
                newFires.push({ x: fx, y: fy });
                if (newGrid[fy][fx] === "brick") {
                  newGrid[fy][fx] = "empty";
                  if (Math.random() < 0.3) {
                    const pu = POWERUPS[Math.floor(Math.random() * POWERUPS.length)];
                    newPowerups.push({ x: fx, y: fy, emoji: pu.emoji, type: pu.type });
                  }
                  break;
                }
              }
            });
          });

          setGrid(newGrid);
          setFires(newFires);
          setPowerupCells(prev => [...prev, ...newPowerups]);

          // Check enemy kills
          setEnemies(prev => {
            const updated = prev.map(e => {
              if (e.alive && newFires.some(f => f.x === e.pos.x && f.y === e.pos.y)) {
                setScore(s => s + 100);
                return { ...e, alive: false };
              }
              return e;
            });
            if (updated.every(e => !e.alive)) {
              setTimeout(() => setWon(true), 500);
            }
            return updated;
          });

          // Check player hit
          if (newFires.some(f => f.x === player.x && f.y === player.y)) {
            if (shield) setShield(false);
            else setAlive(false);
          }

          setTimeout(() => setFires([]), 500);
        }

        return remaining;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [alive, won, bombs, grid, player, shield]);

  // Enemy movement
  useEffect(() => {
    if (!alive || won || !difficulty) return;
    const cfg = DIFF_CONFIG[difficulty];
    const interval = setInterval(() => {
      setEnemies(prev => prev.map(e => {
        if (!e.alive) return e;
        const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]].sort(() => Math.random() - 0.5);
        for (const [ddx, ddy] of dirs) {
          const nx = e.pos.x + ddx;
          const ny = e.pos.y + ddy;
          if (nx >= 0 && nx < GRID && ny >= 0 && ny < GRID && grid[ny][nx] === "empty" && !bombs.some(b => b.pos.x === nx && b.pos.y === ny)) {
            const newPos = { x: nx, y: ny };
            if (nx === player.x && ny === player.y) {
              if (shield) setShield(false);
              else setAlive(false);
            }
            return { ...e, pos: newPos };
          }
        }
        return e;
      }));
    }, cfg.enemySpeed);
    return () => clearInterval(interval);
  }, [alive, won, difficulty, grid, bombs, player, shield]);

  // Touch
  const handleTouchStart = (e: React.TouchEvent) => { touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    if (Math.abs(dx) < 15 && Math.abs(dy) < 15) { placeBomb(); return; }
    if (Math.abs(dx) > Math.abs(dy)) movePlayer(dx > 0 ? 1 : -1, 0);
    else movePlayer(0, dy > 0 ? 1 : -1);
    touchStart.current = null;
  };

  const fireSet = new Set(fires.map(f => `${f.x},${f.y}`));
  const bombSet = new Set(bombs.map(b => `${b.pos.x},${b.pos.y}`));

  // Screens
  if (!difficulty) {
    return (
      <GameLayout title="Bomberman Bíblico" emoji="💣">
        <div className="text-center mt-6 animate-fade-in">
          <div className="text-6xl mb-4">💣</div>
          <p className="font-display text-xl font-bold mb-2">Bomberman Bíblico</p>
          <p className="text-muted-foreground text-sm mb-6">Destrua os inimigos com bombas!<br/>Colete power-ups escondidos nos tijolos.</p>
          <p className="font-display font-bold text-sm mb-3">Dificuldade:</p>
          <div className="flex gap-2 justify-center">
            {(Object.entries(DIFF_CONFIG) as [Difficulty, typeof DIFF_CONFIG.easy][]).map(([key, val]) => (
              <button key={key} onClick={() => startGame(key)} className="btn-game px-5 py-3 text-sm">{val.label}</button>
            ))}
          </div>
        </div>
      </GameLayout>
    );
  }

  if (!alive) {
    return (
      <GameLayout title="Bomberman Bíblico" emoji="💣">
        <div className="text-center mt-8 animate-fade-in">
          <div className="text-6xl mb-4">💥</div>
          <p className="font-display text-2xl font-bold">Fim de Jogo!</p>
          <p className="text-muted-foreground mt-2">Pontos: {score} • Nível: {level}</p>
          <div className="flex gap-2 justify-center mt-6">
            <button onClick={() => { initLevel(difficulty, level); }} className="btn-game">Tentar Novamente</button>
            <button onClick={() => setDifficulty(null)} className="btn-game bg-secondary text-secondary-foreground">Menu</button>
          </div>
        </div>
      </GameLayout>
    );
  }

  if (won) {
    return (
      <GameLayout title="Bomberman Bíblico" emoji="💣">
        <div className="text-center mt-8 animate-fade-in">
          <div className="text-6xl mb-4">🏆</div>
          <p className="font-display text-2xl font-bold">Nível {level} Completo!</p>
          <p className="text-muted-foreground mt-2">Pontos: {score}</p>
          <button onClick={() => { setLevel(l => l + 1); initLevel(difficulty, level + 1); }} className="btn-game mt-6">Próximo Nível ▶</button>
        </div>
      </GameLayout>
    );
  }

  const cellSz = `min(${Math.floor(88 / GRID)}vw, ${Math.floor(420 / GRID)}px)`;

  return (
    <GameLayout title="Bomberman Bíblico" emoji="💣">
      <div className="flex justify-between items-center mb-2 text-xs">
        <span className="font-semibold">⭐ {score}</span>
        <span className="bg-accent/20 px-2 py-1 rounded-full font-semibold">Nível {level}</span>
        <span className="font-semibold">💣×{maxBombs} 🔥{bombRange} {shield ? "🛡️" : ""}</span>
      </div>

      <div className="mx-auto select-none touch-none" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <div className="inline-grid gap-0" style={{ gridTemplateColumns: `repeat(${GRID}, ${cellSz})` }}>
          {grid.flatMap((row, y) => row.map((cell, x) => {
            const key = `${x},${y}`;
            const isPlayer = player.x === x && player.y === y;
            const enemy = enemies.find(e => e.alive && e.pos.x === x && e.pos.y === y);
            const isFire = fireSet.has(key);
            const isBomb = bombSet.has(key);
            const pu = powerupCells.find(p => p.x === x && p.y === y);

            let bg = "bg-card";
            if (cell === "wall") bg = "bg-foreground/20";
            else if (cell === "brick") bg = "bg-amber-800/40 dark:bg-amber-700/30";
            else if (isFire) bg = "bg-orange-500/60";

            return (
              <div key={key}
                className={`flex items-center justify-center ${bg} border border-border/20`}
                style={{ width: cellSz, height: cellSz, fontSize: `calc(${cellSz} * 0.55)` }}
              >
                {isPlayer ? (shield ? "🛡️" : "👦") :
                 enemy ? enemy.emoji :
                 isBomb ? "💣" :
                 isFire ? "🔥" :
                 pu ? pu.emoji :
                 cell === "brick" ? "🧱" :
                 cell === "wall" ? "⬛" : ""}
              </div>
            );
          }))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1 max-w-[180px] mx-auto mt-3">
        <div />
        <button onClick={() => movePlayer(0, -1)} className="btn-game py-2 text-lg">⬆️</button>
        <div />
        <button onClick={() => movePlayer(-1, 0)} className="btn-game py-2 text-lg">⬅️</button>
        <button onClick={placeBomb} className="btn-game py-2 text-lg bg-destructive text-destructive-foreground">💣</button>
        <button onClick={() => movePlayer(1, 0)} className="btn-game py-2 text-lg">➡️</button>
        <div />
        <button onClick={() => movePlayer(0, 1)} className="btn-game py-2 text-lg">⬇️</button>
        <div />
      </div>
    </GameLayout>
  );
};

export default BibleBomberman;
