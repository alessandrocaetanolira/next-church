import { useState, useEffect, useRef } from "react";
import GameLayout from "@/features/new-games/components/GameLayout";

const PATTERN_LENGTH_START = 3;
const MAX_ROUNDS = 7;

const TRUMPETS = ["🎺", "📯", "🎵", "🔔"];

const JerichoWalls = () => {
  const [pattern, setPattern] = useState<number[]>([]);
  const [playerInput, setPlayerInput] = useState<number[]>([]);
  const [round, setRound] = useState(1);
  const [wallHp, setWallHp] = useState(100);
  const [showingPattern, setShowingPattern] = useState(false);
  const [activeButton, setActiveButton] = useState<number | null>(null);
  const [gameState, setGameState] = useState<"intro" | "playing" | "won" | "lost">("intro");
  const [message, setMessage] = useState("");
  const timeouts = useRef<number[]>([]);

  const clearTimeouts = () => {
    timeouts.current.forEach(clearTimeout);
    timeouts.current = [];
  };

  const generatePattern = (length: number) => {
    return Array.from({ length }, () => Math.floor(Math.random() * 4));
  };

  const startRound = (roundNum: number) => {
    clearTimeouts();
    const len = PATTERN_LENGTH_START + roundNum - 1;
    const newPattern = generatePattern(len);
    setPattern(newPattern);
    setPlayerInput([]);
    setShowingPattern(true);
    setMessage(`Rodada ${roundNum} — Observe o padrão!`);

    // Show pattern
    newPattern.forEach((btn, i) => {
      const t1 = window.setTimeout(() => setActiveButton(btn), (i + 1) * 600);
      const t2 = window.setTimeout(() => setActiveButton(null), (i + 1) * 600 + 400);
      timeouts.current.push(t1, t2);
    });

    const t3 = window.setTimeout(() => {
      setShowingPattern(false);
      setMessage("Sua vez! Repita o padrão!");
    }, (newPattern.length + 1) * 600);
    timeouts.current.push(t3);
  };

  const startGame = () => {
    setRound(1);
    setWallHp(100);
    setGameState("playing");
    startRound(1);
  };

  const handleInput = (btn: number) => {
    if (showingPattern || gameState !== "playing") return;

    setActiveButton(btn);
    setTimeout(() => setActiveButton(null), 200);

    const newInput = [...playerInput, btn];
    setPlayerInput(newInput);

    const idx = newInput.length - 1;
    if (newInput[idx] !== pattern[idx]) {
      // Wrong!
      setMessage("Errou! As muralhas resistem... 😤");
      setGameState("lost");
      return;
    }

    if (newInput.length === pattern.length) {
      // Correct!
      const damage = 15 + round * 2;
      const newHp = Math.max(wallHp - damage, 0);
      setWallHp(newHp);

      if (newHp <= 0) {
        setMessage("As muralhas caíram! 🏆");
        setGameState("won");
        return;
      }

      if (round >= MAX_ROUNDS) {
        setMessage("Tempo esgotado! As muralhas aguentaram 😥");
        setGameState("lost");
        return;
      }

      setMessage(`Correto! -${damage} HP na muralha!`);
      const nextRound = round + 1;
      setRound(nextRound);
      setTimeout(() => startRound(nextRound), 1200);
    }
  };

  useEffect(() => () => clearTimeouts(), []);

  if (gameState === "intro") {
    return (
      <GameLayout title="Muralhas de Jericó" emoji="🏰">
        <div className="text-center mt-10 animate-fade-in">
          <div className="text-6xl mb-4">🏰</div>
          <p className="font-display text-xl font-bold mb-2">Muralhas de Jericó</p>
          <p className="text-muted-foreground text-sm mb-6">
            Repita o padrão das trombetas para derrubar as muralhas!<br/>
            Cada rodada fica mais longa! 🎺
          </p>
          <button onClick={startGame} className="btn-game text-lg px-8 py-3">🎺 Começar!</button>
        </div>
      </GameLayout>
    );
  }

  if (gameState === "won") {
    return (
      <GameLayout title="Muralhas de Jericó" emoji="🏰">
        <div className="text-center mt-10 animate-fade-in">
          <div className="text-7xl mb-4">🏆</div>
          <p className="font-display text-2xl font-bold">Jericó caiu!</p>
          <p className="text-muted-foreground mt-2">Você derrubou as muralhas em {round} rodadas!</p>
          <button onClick={startGame} className="btn-game mt-6">Jogar Novamente</button>
        </div>
      </GameLayout>
    );
  }

  if (gameState === "lost") {
    return (
      <GameLayout title="Muralhas de Jericó" emoji="🏰">
        <div className="text-center mt-10 animate-fade-in">
          <div className="text-6xl mb-4">🏰</div>
          <p className="font-display text-2xl font-bold">As muralhas resistiram!</p>
          <p className="text-muted-foreground mt-2">Rodada {round} • Dano total: {100 - wallHp}%</p>
          <button onClick={startGame} className="btn-game mt-6">Tentar Novamente</button>
        </div>
      </GameLayout>
    );
  }

  return (
    <GameLayout title="Muralhas de Jericó" emoji="🏰">
      <div className="text-center mb-3">
        <p className="text-sm font-semibold text-muted-foreground">Rodada {round}/{MAX_ROUNDS}</p>
      </div>

      {/* Wall HP */}
      <div className="bg-card rounded-xl p-4 border border-border mb-4 text-center">
        <div className="text-4xl mb-2">🏰</div>
        <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
          <div className="bg-destructive h-full rounded-full transition-all duration-500"
            style={{ width: `${wallHp}%` }} />
        </div>
        <p className="text-xs text-muted-foreground mt-1">Muralha: {wallHp}%</p>
      </div>

      <p className="text-center text-sm font-semibold mb-4 min-h-[1.5em]">{message}</p>

      {/* Trumpet buttons */}
      <div className="grid grid-cols-2 gap-3 max-w-[280px] mx-auto">
        {TRUMPETS.map((emoji, i) => (
          <button
            key={i}
            onClick={() => handleInput(i)}
            disabled={showingPattern}
            className={`aspect-square rounded-2xl border-2 text-4xl flex items-center justify-center transition-all
              ${activeButton === i
                ? "border-primary bg-primary/20 scale-110"
                : "border-border bg-card hover:bg-secondary"}
              ${showingPattern ? "cursor-not-allowed" : "active:scale-95"}
            `}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-1 mt-4">
        {pattern.map((_, i) => (
          <div key={i} className={`w-3 h-3 rounded-full transition-colors ${
            i < playerInput.length ? "bg-primary" : "bg-muted"
          }`} />
        ))}
      </div>
    </GameLayout>
  );
};

export default JerichoWalls;
