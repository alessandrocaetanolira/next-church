import { useState, useEffect, useRef, useCallback } from "react";
import GameLayout from "@/features/new-games/components/GameLayout";

type Dir = "UP" | "DOWN" | "LEFT" | "RIGHT";
type Pos = { x: number; y: number };
type Difficulty = "easy" | "medium" | "hard";

const BIBLE_ITEMS = [
  { emoji: "🍞", name: "Pão da Vida", points: 10 },
  { emoji: "🍇", name: "Uvas de Canaã", points: 15 },
  { emoji: "💧", name: "Água Viva", points: 10 },
  { emoji: "⭐", name: "Estrela de Belém", points: 20 },
  { emoji: "📜", name: "Pergaminho", points: 25 },
  { emoji: "🕊️", name: "Pomba da Paz", points: 30 },
  { emoji: "🐟", name: "Peixe", points: 10 },
  { emoji: "🫒", name: "Azeitona", points: 15 },
];

const OBSTACLES_EMOJI = ["🪨", "🌵", "🐍"];

const DIFF_CONFIG: Record<Difficulty, { speed: number; gridSize: number; obstacles: number; label: string }> = {
  easy: { speed: 180, gridSize: 12, obstacles: 0, label: "Fácil" },
  medium: { speed: 120, gridSize: 14, obstacles: 5, label: "Médio" },
  hard: { speed: 80, gridSize: 16, obstacles: 10, label: "Difícil" },
};

const BibleSnake = () => {
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [snake, setSnake] = useState<Pos[]>([{ x: 6, y: 6 }]);
  const [dir, setDir] = useState<Dir>("RIGHT");
  const [food, setFood] = useState<Pos & { item: typeof BIBLE_ITEMS[0] }>({ x: 3, y: 3, item: BIBLE_ITEMS[0] });
  const [obstacles, setObstacles] = useState<(Pos & { emoji: string })[]>([]);
  const [score, setScore] = useState(0);
  const [alive, setAlive] = useState(true);
  const [started, setStarted] = useState(false);
  const [collected, setCollected] = useState<string[]>([]);
  const dirRef = useRef<Dir>("RIGHT");
  const touchStart = useRef<Pos | null>(null);

  const config = difficulty ? DIFF_CONFIG[difficulty] : DIFF_CONFIG.easy;

  const spawnFood = useCallback((snk: Pos[], obs: (Pos & { emoji: string })[]) => {
    const occupied = new Set([...snk, ...obs].map(p => `${p.x},${p.y}`));
    let pos: Pos;
    do {
      pos = { x: Math.floor(Math.random() * config.gridSize), y: Math.floor(Math.random() * config.gridSize) };
    } while (occupied.has(`${pos.x},${pos.y}`));
    const item = BIBLE_ITEMS[Math.floor(Math.random() * BIBLE_ITEMS.length)];
    return { ...pos, item };
  }, [config.gridSize]);

  const initGame = useCallback((diff: Difficulty) => {
    const cfg = DIFF_CONFIG[diff];
    const initSnake = [{ x: Math.floor(cfg.gridSize / 2), y: Math.floor(cfg.gridSize / 2) }];
    const obs: (Pos & { emoji: string })[] = [];
    const occupied = new Set(initSnake.map(p => `${p.x},${p.y}`));
    for (let i = 0; i < cfg.obstacles; i++) {
      let pos: Pos;
      do {
        pos = { x: Math.floor(Math.random() * cfg.gridSize), y: Math.floor(Math.random() * cfg.gridSize) };
      } while (occupied.has(`${pos.x},${pos.y}`));
      occupied.add(`${pos.x},${pos.y}`);
      obs.push({ ...pos, emoji: OBSTACLES_EMOJI[Math.floor(Math.random() * OBSTACLES_EMOJI.length)] });
    }
    setSnake(initSnake);
    setObstacles(obs);
    setDir("RIGHT");
    dirRef.current = "RIGHT";
    setScore(0);
    setAlive(true);
    setStarted(true);
    setCollected([]);

    const foodOccupied = new Set([...initSnake, ...obs].map(p => `${p.x},${p.y}`));
    let fp: Pos;
    do {
      fp = { x: Math.floor(Math.random() * cfg.gridSize), y: Math.floor(Math.random() * cfg.gridSize) };
    } while (foodOccupied.has(`${fp.x},${fp.y}`));
    setFood({ ...fp, item: BIBLE_ITEMS[0] });
  }, []);

  // Keyboard
  useEffect(() => {
    if (!started || !alive) return;
    const handle = (e: KeyboardEvent) => {
      const map: Record<string, Dir> = { ArrowUp: "UP", ArrowDown: "DOWN", ArrowLeft: "LEFT", ArrowRight: "RIGHT", w: "UP", s: "DOWN", a: "LEFT", d: "RIGHT" };
      const nd = map[e.key];
      if (!nd) return;
      const opp: Record<Dir, Dir> = { UP: "DOWN", DOWN: "UP", LEFT: "RIGHT", RIGHT: "LEFT" };
      if (opp[nd] !== dirRef.current) { dirRef.current = nd; setDir(nd); }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [started, alive]);

  // Game loop
  useEffect(() => {
    if (!started || !alive || !difficulty) return;
    const tick = setInterval(() => {
      setSnake(prev => {
        const head = prev[0];
        const d = dirRef.current;
        const delta: Record<Dir, Pos> = { UP: { x: 0, y: -1 }, DOWN: { x: 0, y: 1 }, LEFT: { x: -1, y: 0 }, RIGHT: { x: 1, y: 0 } };
        const newHead = { x: head.x + delta[d].x, y: head.y + delta[d].y };

        // Wall collision
        if (newHead.x < 0 || newHead.x >= config.gridSize || newHead.y < 0 || newHead.y >= config.gridSize) {
          setAlive(false);
          return prev;
        }
        // Self collision
        if (prev.some(p => p.x === newHead.x && p.y === newHead.y)) {
          setAlive(false);
          return prev;
        }
        // Obstacle collision
        if (obstacles.some(o => o.x === newHead.x && o.y === newHead.y)) {
          setAlive(false);
          return prev;
        }

        const ate = newHead.x === food.x && newHead.y === food.y;
        const newSnake = [newHead, ...prev];
        if (ate) {
          setScore(s => s + food.item.points);
          setCollected(c => [...c, food.item.emoji]);
          setFood(spawnFood(newSnake, obstacles));
        } else {
          newSnake.pop();
        }
        return newSnake;
      });
    }, config.speed);
    return () => clearInterval(tick);
  }, [started, alive, difficulty, config, food, obstacles, spawnFood]);

  // Touch controls
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
    const opp: Record<Dir, Dir> = { UP: "DOWN", DOWN: "UP", LEFT: "RIGHT", RIGHT: "LEFT" };
    let nd: Dir;
    if (Math.abs(dx) > Math.abs(dy)) nd = dx > 0 ? "RIGHT" : "LEFT";
    else nd = dy > 0 ? "DOWN" : "UP";
    if (opp[nd] !== dirRef.current) { dirRef.current = nd; setDir(nd); }
    touchStart.current = null;
  };

  const changeDir = (nd: Dir) => {
    const opp: Record<Dir, Dir> = { UP: "DOWN", DOWN: "UP", LEFT: "RIGHT", RIGHT: "LEFT" };
    if (opp[nd] !== dirRef.current) { dirRef.current = nd; setDir(nd); }
  };

  // Difficulty selection
  if (!difficulty) {
    return (
      <GameLayout title="Serpente Bíblica" emoji="🐍">
        <div className="text-center mt-6 animate-fade-in">
          <div className="text-6xl mb-4">🐍</div>
          <p className="font-display text-xl font-bold mb-2">Serpente Bíblica</p>
          <p className="text-muted-foreground text-sm mb-6">Colete itens bíblicos e cresça!<br/>Não bata nas paredes ou em si mesmo.</p>
          <p className="font-display font-bold text-sm mb-3">Dificuldade:</p>
          <div className="flex gap-2 justify-center">
            {(Object.entries(DIFF_CONFIG) as [Difficulty, typeof DIFF_CONFIG.easy][]).map(([key, val]) => (
              <button key={key} onClick={() => { setDifficulty(key); initGame(key); }}
                className="btn-game px-5 py-3 text-sm">
                {val.label}
              </button>
            ))}
          </div>
        </div>
      </GameLayout>
    );
  }

  if (!alive) {
    return (
      <GameLayout title="Serpente Bíblica" emoji="🐍">
        <div className="text-center mt-8 animate-fade-in">
          <div className="text-6xl mb-4">💀</div>
          <p className="font-display text-2xl font-bold">Fim de Jogo!</p>
          <p className="text-muted-foreground mt-2">Pontos: {score} • Coletados: {collected.length}</p>
          {collected.length > 0 && (
            <div className="flex flex-wrap gap-1 justify-center mt-3">
              {collected.map((e, i) => <span key={i} className="text-xl">{e}</span>)}
            </div>
          )}
          <div className="flex gap-2 justify-center mt-6">
            <button onClick={() => initGame(difficulty)} className="btn-game">Jogar Novamente</button>
            <button onClick={() => setDifficulty(null)} className="btn-game bg-secondary text-secondary-foreground">Mudar Dificuldade</button>
          </div>
        </div>
      </GameLayout>
    );
  }

  const cellSize = `min(${Math.floor(85 / config.gridSize)}vw, ${Math.floor(400 / config.gridSize)}px)`;
  const snakeSet = new Set(snake.map(p => `${p.x},${p.y}`));

  return (
    <GameLayout title="Serpente Bíblica" emoji="🐍">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold">⭐ {score}</span>
        <span className="text-xs bg-accent/20 px-2 py-1 rounded-full font-semibold">{DIFF_CONFIG[difficulty].label}</span>
        <span className="text-sm font-semibold">🐍 {snake.length}</span>
      </div>

      <div
        className="mx-auto bg-card border border-border rounded-xl overflow-hidden select-none touch-none p-1"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="inline-grid gap-px" style={{ gridTemplateColumns: `repeat(${config.gridSize}, ${cellSize})` }}>
          {Array.from({ length: config.gridSize * config.gridSize }).map((_, idx) => {
            const x = idx % config.gridSize;
            const y = Math.floor(idx / config.gridSize);
            const key = `${x},${y}`;
            const isHead = snake[0].x === x && snake[0].y === y;
            const isSnake = snakeSet.has(key);
            const isFood = food.x === x && food.y === y;
            const obstacle = obstacles.find(o => o.x === x && o.y === y);

            return (
              <div key={key}
                className={`flex items-center justify-center transition-colors ${
                  isHead ? "bg-primary rounded-sm" :
                  isSnake ? "bg-primary/60 rounded-sm" :
                  obstacle ? "bg-muted" :
                  (x + y) % 2 === 0 ? "bg-card" : "bg-muted/30"
                }`}
                style={{ width: cellSize, height: cellSize, fontSize: `calc(${cellSize} * 0.6)` }}
              >
                {isHead ? "😈" : isFood ? food.item.emoji : obstacle ? obstacle.emoji : ""}
              </div>
            );
          })}
        </div>
      </div>

      {/* D-pad controls */}
      <div className="grid grid-cols-3 gap-1 max-w-[180px] mx-auto mt-3">
        <div />
        <button onClick={() => changeDir("UP")} className="btn-game py-2 text-lg">⬆️</button>
        <div />
        <button onClick={() => changeDir("LEFT")} className="btn-game py-2 text-lg">⬅️</button>
        <div className="flex items-center justify-center text-xs text-muted-foreground">🎮</div>
        <button onClick={() => changeDir("RIGHT")} className="btn-game py-2 text-lg">➡️</button>
        <div />
        <button onClick={() => changeDir("DOWN")} className="btn-game py-2 text-lg">⬇️</button>
        <div />
      </div>

      {collected.length > 0 && (
        <div className="flex flex-wrap gap-0.5 justify-center mt-2">
          {collected.slice(-10).map((e, i) => <span key={i} className="text-sm">{e}</span>)}
        </div>
      )}
    </GameLayout>
  );
};

export default BibleSnake;
