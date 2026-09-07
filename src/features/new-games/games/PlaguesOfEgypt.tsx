import { useState } from "react";
import GameLayout from "@/features/new-games/components/GameLayout";

const PLAGUES = [
  { name: "Sangue", emoji: "🩸", desc: "As águas do Nilo se transformaram em sangue" },
  { name: "Rãs", emoji: "🐸", desc: "Rãs invadiram toda a terra do Egito" },
  { name: "Piolhos", emoji: "🦟", desc: "O pó da terra se transformou em piolhos" },
  { name: "Moscas", emoji: "🪰", desc: "Enxames de moscas cobriram o Egito" },
  { name: "Peste", emoji: "🐄", desc: "Uma peste mortal atacou o gado egípcio" },
  { name: "Úlceras", emoji: "🤕", desc: "Úlceras e feridas apareceram nos egípcios" },
  { name: "Saraiva", emoji: "🌨️", desc: "Chuva de pedras de gelo destruiu as plantações" },
  { name: "Gafanhotos", emoji: "🦗", desc: "Gafanhotos devoraram toda a vegetação" },
  { name: "Trevas", emoji: "🌑", desc: "Trevas cobriram o Egito por três dias" },
  { name: "Primogênitos", emoji: "💀", desc: "Os primogênitos do Egito foram mortos" },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const PlaguesOfEgypt = () => {
  const [shuffled, setShuffled] = useState(() => shuffle(PLAGUES));
  const [placed, setPlaced] = useState<typeof PLAGUES>([]);
  const [wrong, setWrong] = useState(false);
  const [finished, setFinished] = useState(false);
  const [errors, setErrors] = useState(0);

  const handlePick = (plague: typeof PLAGUES[0]) => {
    const nextIndex = placed.length;
    if (plague.name === PLAGUES[nextIndex].name) {
      const newPlaced = [...placed, plague];
      setPlaced(newPlaced);
      setShuffled(prev => prev.filter(p => p.name !== plague.name));
      setWrong(false);
      if (newPlaced.length === 10) setFinished(true);
    } else {
      setWrong(true);
      setErrors(e => e + 1);
      setTimeout(() => setWrong(false), 800);
    }
  };

  const restart = () => {
    setShuffled(shuffle(PLAGUES));
    setPlaced([]);
    setWrong(false);
    setFinished(false);
    setErrors(0);
  };

  if (finished) {
    return (
      <GameLayout title="Pragas do Egito" emoji="🏺">
        <div className="text-center mt-10 animate-fade-in">
          <div className="text-6xl mb-4">{errors === 0 ? "🏆" : errors <= 3 ? "⭐" : "🏺"}</div>
          <p className="font-display text-2xl font-bold">Todas as pragas ordenadas!</p>
          <p className="text-muted-foreground mt-2">Erros: {errors}</p>
          <button onClick={restart} className="btn-game mt-6">Jogar Novamente</button>
        </div>
      </GameLayout>
    );
  }

  return (
    <GameLayout title="Pragas do Egito" emoji="🏺">
      <p className="text-center text-sm text-muted-foreground mb-3">
        Ordene as 10 pragas na sequência correta!
      </p>

      {/* Placed */}
      <div className="space-y-1 mb-4">
        {placed.map((p, i) => (
          <div key={p.name} className="flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-lg p-2 animate-fade-in">
            <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}.</span>
            <span className="text-xl">{p.emoji}</span>
            <span className="text-sm font-semibold">{p.name}</span>
          </div>
        ))}
        {placed.length < 10 && (
          <div className={`flex items-center gap-2 border-2 border-dashed rounded-lg p-2 transition-colors
            ${wrong ? "border-destructive bg-destructive/10" : "border-border"}`}>
            <span className="text-xs font-bold text-muted-foreground w-5">{placed.length + 1}.</span>
            <span className="text-sm text-muted-foreground">Qual é a próxima praga?</span>
          </div>
        )}
      </div>

      {/* Options */}
      <div className="grid grid-cols-2 gap-2">
        {shuffled.map(p => (
          <button key={p.name} onClick={() => handlePick(p)}
            className="flex items-center gap-2 bg-card border border-border rounded-lg p-3 hover:border-primary transition-all active:scale-95">
            <span className="text-2xl">{p.emoji}</span>
            <div className="text-left">
              <p className="text-sm font-bold">{p.name}</p>
              <p className="text-xs text-muted-foreground line-clamp-1">{p.desc}</p>
            </div>
          </button>
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground mt-3">Erros: {errors}</p>
    </GameLayout>
  );
};

export default PlaguesOfEgypt;
