import { useState } from "react";
import GameLayout from "@/features/new-games/components/GameLayout";

const ROUNDS = [
  {
    title: "Personagens e Eventos",
    pairs: [
      { left: "Moisés", right: "Abriu o Mar Vermelho" },
      { left: "Noé", right: "Construiu a Arca" },
      { left: "Davi", right: "Derrotou Golias" },
      { left: "Daniel", right: "Cova dos Leões" },
      { left: "Jonas", right: "Engolido pelo peixe" },
    ],
  },
  {
    title: "Livros e Temas",
    pairs: [
      { left: "Gênesis", right: "Criação do mundo" },
      { left: "Êxodo", right: "Saída do Egito" },
      { left: "Salmos", right: "Cânticos e louvor" },
      { left: "Provérbios", right: "Sabedoria" },
      { left: "Apocalipse", right: "Fim dos tempos" },
    ],
  },
  {
    title: "Casais Bíblicos",
    pairs: [
      { left: "Adão", right: "Eva" },
      { left: "Abraão", right: "Sara" },
      { left: "Isaque", right: "Rebeca" },
      { left: "Jacó", right: "Raquel" },
      { left: "Boaz", right: "Rute" },
    ],
  },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const ConnectPairsGame = () => {
  const [roundIdx, setRoundIdx] = useState(0);
  const [score, setScore] = useState(0);

  const round = ROUNDS[roundIdx % ROUNDS.length];
  const [shuffledRight] = useState(() => shuffle(round.pairs.map(p => p.right)));
  const [rightItems, setRightItems] = useState(shuffledRight);
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [selectedRight, setSelectedRight] = useState<number | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [wrongPair, setWrongPair] = useState<[number, number] | null>(null);

  const handleLeftClick = (i: number) => {
    if (matched.has(i)) return;
    setSelectedLeft(i);
    if (selectedRight !== null) checkMatch(i, selectedRight);
  };

  const handleRightClick = (i: number) => {
    if (matched.has(i)) return;
    setSelectedRight(i);
    if (selectedLeft !== null) checkMatch(selectedLeft, i);
  };

  const checkMatch = (li: number, ri: number) => {
    const leftItem = round.pairs[li];
    const rightItem = rightItems[ri];
    if (leftItem.right === rightItem) {
      setMatched(prev => new Set([...prev, li]));
      setScore(s => s + 1);
      setSelectedLeft(null);
      setSelectedRight(null);
    } else {
      setWrongPair([li, ri]);
      setTimeout(() => {
        setWrongPair(null);
        setSelectedLeft(null);
        setSelectedRight(null);
      }, 800);
    }
  };

  const allMatched = matched.size === round.pairs.length;

  const nextRound = () => {
    const next = roundIdx + 1;
    setRoundIdx(next);
    const nextRoundData = ROUNDS[next % ROUNDS.length];
    setRightItems(shuffle(nextRoundData.pairs.map(p => p.right)));
    setSelectedLeft(null);
    setSelectedRight(null);
    setMatched(new Set());
    setWrongPair(null);
  };

  return (
    <GameLayout title="Conecte os Pares" emoji="🔗">
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm text-muted-foreground font-semibold">{round.title}</span>
        <span className="text-sm font-semibold bg-accent/20 px-3 py-1 rounded-full">⭐ {score}</span>
      </div>

      <p className="text-sm text-muted-foreground text-center mb-4">Selecione um item da esquerda e o correspondente da direita</p>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          {round.pairs.map((pair, i) => {
            const isMatched = matched.has(i);
            const isSelected = selectedLeft === i;
            const isWrong = wrongPair?.[0] === i;
            return (
              <button
                key={i}
                onClick={() => handleLeftClick(i)}
                className={`w-full p-3 rounded-lg border-2 text-sm font-semibold text-left transition-all ${
                  isMatched ? "border-game-success bg-game-success/10 opacity-60" :
                  isWrong ? "border-game-error bg-game-error/10" :
                  isSelected ? "border-primary bg-primary/10" :
                  "border-border bg-card hover:bg-secondary"
                }`}
              >
                {pair.left}
              </button>
            );
          })}
        </div>
        <div className="space-y-2">
          {rightItems.map((right, i) => {
            const matchedIdx = round.pairs.findIndex(p => p.right === right);
            const isMatched = matched.has(matchedIdx);
            const isSelected = selectedRight === i;
            const isWrong = wrongPair?.[1] === i;
            return (
              <button
                key={i}
                onClick={() => handleRightClick(i)}
                className={`w-full p-3 rounded-lg border-2 text-sm font-semibold text-left transition-all ${
                  isMatched ? "border-game-success bg-game-success/10 opacity-60" :
                  isWrong ? "border-game-error bg-game-error/10" :
                  isSelected ? "border-primary bg-primary/10" :
                  "border-border bg-card hover:bg-secondary"
                }`}
              >
                {right}
              </button>
            );
          })}
        </div>
      </div>

      {allMatched && (
        <div className="text-center mt-4 animate-bounce-in">
          <p className="text-xl font-display font-bold text-game-success mb-3">🎉 Todos conectados!</p>
          <button onClick={nextRound} className="btn-game">Próxima Rodada</button>
        </div>
      )}
    </GameLayout>
  );
};

export default ConnectPairsGame;
