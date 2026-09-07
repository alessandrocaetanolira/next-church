import { useState, useEffect } from "react";
import GameLayout from "@/features/new-games/components/GameLayout";
import ChallengeMode from "@/features/new-games/components/ChallengeMode";
import { useUser } from "@/features/new-games/contexts/UserContext";

const IMAGES = [
  { id: 1, img: "/jogos-novos/memory/adam-eve.png" },
  { id: 2, img: "/jogos-novos/memory/moses-sea.png" },
  { id: 3, img: "/jogos-novos/memory/david-goliath.png" },
  { id: 4, img: "/jogos-novos/memory/noah-ark.png" },
  { id: 5, img: "/jogos-novos/memory/jonah-fish.png" },
  { id: 6, img: "/jogos-novos/memory/daniel-lions.png" },
];

interface Card {
  id: string;
  pairId: number;
  img: string;
  flipped: boolean;
  matched: boolean;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function createCards(): Card[] {
  return shuffle(
    IMAGES.flatMap(p => [
      { id: `${p.id}a`, pairId: p.id, img: p.img, flipped: false, matched: false },
      { id: `${p.id}b`, pairId: p.id, img: p.img, flipped: false, matched: false },
    ])
  );
}

type GameState = "menu" | "playing";

const MemoryGame = () => {
  const { nickname } = useUser();
  const [gameState, setGameState] = useState<GameState>("menu");
  const [mode, setMode] = useState<"solo" | "versus">("solo");
  const [players, setPlayers] = useState<[string, string]>(["", ""]);
  const [scores, setScores] = useState([0, 0]);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);

  const [cards, setCards] = useState<Card[]>(createCards);
  const [flippedIds, setFlippedIds] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);

  const handleStart = (m: "solo" | "versus", p?: [string, string]) => {
    setMode(m);
    setPlayers(p || [nickname || "Jogador", ""]);
    setScores([0, 0]);
    setCurrentPlayerIdx(0);
    setCards(createCards());
    setFlippedIds([]);
    setMoves(0);
    setGameState("playing");
  };

  const handleFlip = (id: string) => {
    const card = cards.find(c => c.id === id);
    if (!card || card.flipped || card.matched || flippedIds.length >= 2) return;
    const newFlipped = [...flippedIds, id];
    setFlippedIds(newFlipped);
    setCards(prev => prev.map(c => c.id === id ? { ...c, flipped: true } : c));
    if (newFlipped.length === 2) setMoves(m => m + 1);
  };

  useEffect(() => {
    if (flippedIds.length === 2) {
      const [a, b] = flippedIds.map(id => cards.find(c => c.id === id)!);
      const timer = setTimeout(() => {
        if (a.pairId === b.pairId) {
          setCards(prev => prev.map(c => c.pairId === a.pairId ? { ...c, matched: true } : c));
          if (mode === "versus") {
            setScores(prev => {
              const n = [...prev];
              n[currentPlayerIdx]++;
              return n;
            });
          }
        } else {
          setCards(prev => prev.map(c => flippedIds.includes(c.id) ? { ...c, flipped: false } : c));
          if (mode === "versus") setCurrentPlayerIdx(i => (i + 1) % 2);
        }
        setFlippedIds([]);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [flippedIds, cards, mode, currentPlayerIdx]);

  const allMatched = cards.every(c => c.matched);

  const restart = () => {
    setCards(createCards());
    setFlippedIds([]);
    setMoves(0);
    setScores([0, 0]);
    setCurrentPlayerIdx(0);
  };

  return (
    <GameLayout title="Jogo da Memória" emoji="🧠">
      {gameState === "menu" ? (
        <ChallengeMode onStart={handleStart} currentPlayer={nickname || "Jogador"} />
      ) : (
        <>
          <div className="text-center mb-3">
            {mode === "versus" ? (
              <div className="flex justify-center gap-4 text-sm">
                <span className={`px-3 py-1 rounded-full font-semibold ${currentPlayerIdx === 0 ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
                  {players[0]}: {scores[0]}
                </span>
                <span className={`px-3 py-1 rounded-full font-semibold ${currentPlayerIdx === 1 ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
                  {players[1]}: {scores[1]}
                </span>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">Movimentos: {moves}</span>
            )}
          </div>

          {allMatched && (
            <div className="text-center mb-4 animate-bounce-in">
              <p className="text-xl font-display font-bold text-game-success">
                🎉 {mode === "versus"
                  ? scores[0] > scores[1] ? `${players[0]} venceu!` : scores[1] > scores[0] ? `${players[1]} venceu!` : "Empate!"
                  : `Parabéns! ${moves} movimentos!`}
              </p>
              <div className="flex gap-2 justify-center mt-3">
                <button onClick={restart} className="btn-game text-sm">Jogar Novamente</button>
                <button onClick={() => setGameState("menu")} className="px-4 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-secondary transition-colors">Menu</button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            {cards.map(card => (
              <button
                key={card.id}
                onClick={() => handleFlip(card.id)}
                className={`aspect-square rounded-lg border-2 flex items-center justify-center p-1 overflow-hidden transition-all duration-300 ${
                  card.matched ? "border-game-success bg-game-success/10" :
                  card.flipped ? "border-primary bg-primary/10" :
                  "border-border bg-card hover:bg-secondary"
                }`}
              >
                {card.flipped || card.matched ? (
                  <img src={card.img} alt="carta" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-2xl">✝️</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </GameLayout>
  );
};

export default MemoryGame;
