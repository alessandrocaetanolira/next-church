import { useState, useEffect, useRef, useCallback } from "react";
import GameLayout from "@/features/new-games/components/GameLayout";

const LANE_COUNT = 3;
const TICK_MS = 80;
const OBSTACLE_EMOJIS = ["🐍", "🦂", "🌊", "⚡", "🔥", "💀", "🪨"];
const COLLECTIBLE_EMOJIS = ["⭐", "🍞", "💧"];

interface Obj {
  lane: number;
  y: number;
  emoji: string;
  type: "obstacle" | "collectible";
}

const ExodusRunner = () => {
  const [lane, setLane] = useState(1);
  const [objects, setObjects] = useState<Obj[]>([]);
  const [score, setScore] = useState(0);
  const [distance, setDistance] = useState(0);
  const [alive, setAlive] = useState(true);
  const [started, setStarted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const tickRef = useRef<number | null>(null);
  const touchStart = useRef<number | null>(null);

  const moveLeft = useCallback(() => setLane(l => Math.max(0, l - 1)), []);
  const moveRight = useCallback(() => setLane(l => Math.min(LANE_COUNT - 1, l + 1)), []);

  useEffect(() => {
    if (!started || !alive) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a") moveLeft();
      if (e.key === "ArrowRight" || e.key === "d") moveRight();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [started, alive, moveLeft, moveRight]);

  useEffect(() => {
    if (!started || !alive) return;

    tickRef.current = window.setInterval(() => {
      setDistance(d => d + 1);
      setSpeed(s => Math.min(s + 0.002, 3));

      setObjects(prev => {
        const next = prev.map(o => ({ ...o, y: o.y + speed })).filter(o => o.y < 12);

        // Spawn
        if (Math.random() < 0.15 + speed * 0.02) {
          const spawnLane = Math.floor(Math.random() * LANE_COUNT);
          const isCollectible = Math.random() < 0.2;
          next.push({
            lane: spawnLane,
            y: 0,
            emoji: isCollectible
              ? COLLECTIBLE_EMOJIS[Math.floor(Math.random() * COLLECTIBLE_EMOJIS.length)]
              : OBSTACLE_EMOJIS[Math.floor(Math.random() * OBSTACLE_EMOJIS.length)],
            type: isCollectible ? "collectible" : "obstacle",
          });
        }

        return next;
      });
    }, TICK_MS);

    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [started, alive, speed]);

  // Collision
  useEffect(() => {
    objects.forEach(o => {
      if (o.lane === lane && o.y >= 9 && o.y <= 10.5) {
        if (o.type === "obstacle") {
          setAlive(false);
        } else {
          setScore(s => s + 10);
          setObjects(prev => prev.filter(p => p !== o));
        }
      }
    });
  }, [objects, lane]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStart.current;
    if (Math.abs(diff) > 30) {
      if (diff < 0) moveLeft();
      else moveRight();
    }
    touchStart.current = null;
  };

  const restart = () => {
    setLane(1);
    setObjects([]);
    setScore(0);
    setDistance(0);
    setAlive(true);
    setSpeed(1);
    setStarted(true);
  };

  if (!started) {
    return (
      <GameLayout title="Fuga do Egito" emoji="🏃">
        <div className="text-center mt-10 animate-fade-in">
          <div className="text-6xl mb-4">🏃‍♂️</div>
          <p className="font-display text-xl font-bold mb-2">Fuja do Faraó!</p>
          <p className="text-muted-foreground text-sm mb-6">Desvie dos obstáculos e colete itens.<br/>Deslize para os lados ou use ← →</p>
          <button onClick={() => setStarted(true)} className="btn-game text-lg px-8 py-3">▶ Começar</button>
        </div>
      </GameLayout>
    );
  }

  if (!alive) {
    return (
      <GameLayout title="Fuga do Egito" emoji="🏃">
        <div className="text-center mt-10 animate-fade-in">
          <div className="text-6xl mb-4">💥</div>
          <p className="font-display text-2xl font-bold">Capturado!</p>
          <p className="text-muted-foreground mt-2">Distância: {distance}m • Pontos: {score}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {distance > 200 ? "Quase chegou à Terra Prometida! 🌟" : distance > 100 ? "Boa corrida! 🏅" : "Tente novamente! 💪"}
          </p>
          <button onClick={restart} className="btn-game mt-6">Tentar Novamente</button>
        </div>
      </GameLayout>
    );
  }

  return (
    <GameLayout title="Fuga do Egito" emoji="🏃">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold">🏃 {distance}m</span>
        <span className="text-sm font-semibold bg-accent/20 px-3 py-1 rounded-full">⭐ {score}</span>
      </div>

      <div className="relative bg-card border border-border rounded-xl overflow-hidden select-none"
        style={{ height: "420px" }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Lanes */}
        <div className="absolute inset-0 flex">
          {[0, 1, 2].map(i => (
            <div key={i} className={`flex-1 ${i < 2 ? "border-r border-border/30" : ""}`} />
          ))}
        </div>

        {/* Desert lines moving */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="absolute w-1 bg-muted-foreground/10 rounded"
            style={{
              left: `${15 + i * 12}%`,
              height: "20px",
              top: `${((distance * 3 + i * 50) % 420)}px`,
            }}
          />
        ))}

        {/* Objects */}
        {objects.map((o, i) => (
          <div key={i} className="absolute text-2xl transition-none"
            style={{
              left: `${o.lane * 33.33 + 16.66 - 4}%`,
              top: `${(o.y / 12) * 100}%`,
            }}>
            {o.emoji}
          </div>
        ))}

        {/* Player */}
        <div className="absolute text-3xl transition-all duration-100"
          style={{
            left: `${lane * 33.33 + 16.66 - 5}%`,
            bottom: "30px",
          }}>
          🏃‍♂️
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-3 gap-2 mt-3">
        <button onClick={moveLeft} className="btn-game py-3 text-lg">⬅️</button>
        <div className="flex items-center justify-center text-muted-foreground text-xs">Deslize</div>
        <button onClick={moveRight} className="btn-game py-3 text-lg">➡️</button>
      </div>
    </GameLayout>
  );
};

export default ExodusRunner;
