import { useState, useEffect, useRef } from "react";
import GameLayout from "@/features/new-games/components/GameLayout";

interface Target {
  id: number;
  x: number;
  y: number;
  emoji: string;
  points: number;
  speed: number;
  direction: number;
}

const TARGETS = [
  { emoji: "👹", points: 10, label: "Golias" },
  { emoji: "🐻", points: 15, label: "Urso" },
  { emoji: "🦁", points: 15, label: "Leão" },
  { emoji: "🐍", points: 20, label: "Serpente" },
  { emoji: "🗡️", points: 5, label: "Espada" },
];

const DavidSling = () => {
  const [targets, setTargets] = useState<Target[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [hits, setHits] = useState(0);
  const [shots, setShots] = useState(0);
  const [hitEffect, setHitEffect] = useState<{ x: number; y: number; points: number } | null>(null);
  const nextId = useRef(0);

  useEffect(() => {
    if (!started || finished) return;
    if (timeLeft <= 0) { setFinished(true); return; }
    const t = setTimeout(() => setTimeLeft(tl => tl - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, started, finished]);

  // Spawn targets
  useEffect(() => {
    if (!started || finished) return;
    const interval = setInterval(() => {
      const template = TARGETS[Math.floor(Math.random() * TARGETS.length)];
      const fromLeft = Math.random() > 0.5;
      setTargets(prev => [...prev.filter(t => t.x > -10 && t.x < 110), {
        id: nextId.current++,
        x: fromLeft ? -5 : 105,
        y: 10 + Math.random() * 60,
        emoji: template.emoji,
        points: template.points,
        speed: 0.5 + Math.random() * 1.5,
        direction: fromLeft ? 1 : -1,
      }]);
    }, 1200);
    return () => clearInterval(interval);
  }, [started, finished]);

  // Move targets
  useEffect(() => {
    if (!started || finished) return;
    const frame = setInterval(() => {
      setTargets(prev => prev.map(t => ({
        ...t,
        x: t.x + t.speed * t.direction,
        y: t.y + Math.sin(t.x * 0.05) * 0.5,
      })).filter(t => t.x > -10 && t.x < 110));
    }, 50);
    return () => clearInterval(frame);
  }, [started, finished]);

  const hitTarget = (id: number, e: React.MouseEvent | React.TouchEvent) => {
    const target = targets.find(t => t.id === id);
    if (!target) return;

    setShots(s => s + 1);
    setHits(h => h + 1);
    setScore(s => s + target.points);
    setTargets(prev => prev.filter(t => t.id !== id));

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setHitEffect({ x: target.x, y: target.y, points: target.points });
    setTimeout(() => setHitEffect(null), 500);
  };

  const handleMiss = () => {
    setShots(s => s + 1);
  };

  if (!started) {
    return (
      <GameLayout title="Funda de Davi" emoji="🪨">
        <div className="text-center mt-10 animate-fade-in">
          <div className="text-6xl mb-4">🪨</div>
          <p className="font-display text-xl font-bold mb-2">Funda de Davi</p>
          <p className="text-muted-foreground text-sm mb-6">
            Acerte os inimigos que aparecem!<br/>
            Toque neles para atirar pedras 🪨
          </p>
          <button onClick={() => setStarted(true)} className="btn-game text-lg px-8 py-3">🎯 Começar!</button>
        </div>
      </GameLayout>
    );
  }

  if (finished) {
    const accuracy = shots > 0 ? Math.round((hits / shots) * 100) : 0;
    return (
      <GameLayout title="Funda de Davi" emoji="🪨">
        <div className="text-center mt-10 animate-fade-in">
          <div className="text-6xl mb-4">{score > 100 ? "🏆" : score > 50 ? "🎯" : "🪨"}</div>
          <p className="font-display text-2xl font-bold">{score} pontos!</p>
          <p className="text-muted-foreground mt-2">Acertos: {hits} • Precisão: {accuracy}%</p>
          <button onClick={() => { setStarted(true); setFinished(false); setScore(0); setHits(0); setShots(0); setTimeLeft(30); setTargets([]); }}
            className="btn-game mt-6">Jogar Novamente</button>
        </div>
      </GameLayout>
    );
  }

  return (
    <GameLayout title="Funda de Davi" emoji="🪨">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold">🎯 {score} pts</span>
        <span className={`text-sm font-bold px-3 py-1 rounded-full ${timeLeft <= 10 ? "bg-destructive/20 text-destructive animate-pulse" : "bg-accent/20"}`}>
          ⏰ {timeLeft}s
        </span>
      </div>

      <div className="relative bg-gradient-to-b from-sky-200 to-amber-100 dark:from-sky-900 dark:to-amber-900 rounded-xl overflow-hidden cursor-crosshair select-none"
        style={{ height: "380px" }}
        onClick={handleMiss}
      >
        {/* Targets */}
        {targets.map(t => (
          <button key={t.id}
            onClick={(e) => { e.stopPropagation(); hitTarget(t.id, e); }}
            className="absolute text-3xl hover:scale-125 active:scale-75 transition-transform cursor-pointer z-10"
            style={{ left: `${t.x}%`, top: `${t.y}%`, transform: `scaleX(${t.direction})` }}>
            {t.emoji}
          </button>
        ))}

        {/* Hit effect */}
        {hitEffect && (
          <div className="absolute text-lg font-bold text-primary animate-fade-in z-20"
            style={{ left: `${hitEffect.x}%`, top: `${hitEffect.y - 5}%` }}>
            +{hitEffect.points}
          </div>
        )}

        {/* David at bottom */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-4xl">👦</div>

        {/* Ground */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-amber-700/30 dark:bg-amber-800/40" />
      </div>

      <p className="text-center text-xs text-muted-foreground mt-2">Toque nos inimigos para acertar!</p>
    </GameLayout>
  );
};

export default DavidSling;
