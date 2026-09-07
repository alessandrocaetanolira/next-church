import { useState, useEffect, useCallback } from "react";
import GameLayout from "@/features/new-games/components/GameLayout";

interface Animal {
  id: number;
  name: string;
  emoji: string;
  saved: boolean;
  wrong: boolean;
}

const REAL_ANIMALS = [
  "🐑 Ovelha", "🐄 Boi", "🐎 Cavalo", "🐪 Camelo", "🕊️ Pomba",
  "🐐 Cabra", "🐓 Galo", "🐕 Cão", "🐈 Gato", "🐘 Elefante",
  "🦁 Leão", "🐻 Urso", "🦅 Águia", "🐍 Serpente", "🐟 Peixe",
  "🦌 Cervo", "🐇 Coelho", "🐂 Touro", "🐖 Porco", "🐫 Dromedário",
];

const FAKE_ANIMALS = [
  "🤖 Robô", "🦄 Unicórnio", "🐲 Dragão", "👽 Alien", "🧜 Sereia",
  "🦖 Dinossauro", "🧟 Zumbi", "🎃 Abóbora", "🍕 Pizza", "🚀 Foguete",
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const ArkSurvival = () => {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [timeLeft, setTimeLeft] = useState(30);
  const [score, setScore] = useState(0);
  const [errors, setErrors] = useState(0);
  const [finished, setFinished] = useState(false);
  const [started, setStarted] = useState(false);
  const [flash, setFlash] = useState<number | null>(null);

  const startGame = useCallback(() => {
    const reals = shuffle(REAL_ANIMALS).slice(0, 8);
    const fakes = shuffle(FAKE_ANIMALS).slice(0, 4);
    const all = shuffle([...reals, ...fakes]).map((a, i) => {
      const [emoji, name] = [a.split(" ")[0], a.split(" ").slice(1).join(" ")];
      return { id: i, name, emoji, saved: false, wrong: reals.includes(a) ? false : true };
    });
    // wrong here means "is fake"
    const finalAnimals = all.map(a => ({
      ...a,
      wrong: !REAL_ANIMALS.includes(`${a.emoji} ${a.name}`),
    }));
    setAnimals(finalAnimals);
    setTimeLeft(30);
    setScore(0);
    setErrors(0);
    setFinished(false);
    setStarted(true);
  }, []);

  useEffect(() => {
    if (!started || finished) return;
    if (timeLeft <= 0) { setFinished(true); return; }
    const t = setTimeout(() => setTimeLeft(tl => tl - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, started, finished]);

  const tapAnimal = (id: number) => {
    if (finished) return;
    const animal = animals.find(a => a.id === id);
    if (!animal || animal.saved) return;

    setFlash(id);
    setTimeout(() => setFlash(null), 300);

    if (animal.wrong) {
      setErrors(e => e + 1);
      setTimeLeft(t => Math.max(t - 3, 0));
    } else {
      setScore(s => s + 1);
      setAnimals(prev => prev.map(a => a.id === id ? { ...a, saved: true } : a));
    }

    // Check win
    const savedCount = animals.filter(a => !a.wrong && a.id !== id).filter(a => a.saved).length + (animal.wrong ? 0 : 1);
    const totalReal = animals.filter(a => !a.wrong).length;
    if (savedCount >= totalReal) setFinished(true);
  };

  if (!started) {
    return (
      <GameLayout title="Arca de Noé" emoji="🚢">
        <div className="text-center mt-10 animate-fade-in">
          <div className="text-6xl mb-4">🚢</div>
          <p className="font-display text-xl font-bold mb-2">Salve os Animais!</p>
          <p className="text-muted-foreground text-sm mb-6">
            Toque nos animais REAIS para salvá-los na arca.<br/>
            Cuidado! Criaturas falsas tiram tempo! ⏰
          </p>
          <button onClick={startGame} className="btn-game text-lg px-8 py-3">🚢 Embarcar!</button>
        </div>
      </GameLayout>
    );
  }

  if (finished) {
    const total = animals.filter(a => !a.wrong).length;
    return (
      <GameLayout title="Arca de Noé" emoji="🚢">
        <div className="text-center mt-10 animate-fade-in">
          <div className="text-6xl mb-4">{score >= total ? "🌈" : score >= total / 2 ? "🚢" : "🌊"}</div>
          <p className="font-display text-2xl font-bold">{score}/{total} salvos!</p>
          <p className="text-muted-foreground mt-2">
            {score >= total ? "Todos salvos! O arco-íris brilha! 🌈" :
              score >= total / 2 ? "Boa parte foi salva!" : "O dilúvio levou muitos... 😢"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Erros: {errors}</p>
          <button onClick={startGame} className="btn-game mt-6">Jogar Novamente</button>
        </div>
      </GameLayout>
    );
  }

  return (
    <GameLayout title="Arca de Noé" emoji="🚢">
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm font-semibold">🚢 Salvos: {score}</span>
        <span className={`text-sm font-bold px-3 py-1 rounded-full ${timeLeft <= 10 ? "bg-destructive/20 text-destructive animate-pulse" : "bg-accent/20"}`}>
          ⏰ {timeLeft}s
        </span>
      </div>

      {/* Rain effect */}
      <div className="relative">
        <div className="w-full bg-muted rounded-full h-2 mb-4 overflow-hidden">
          <div className="bg-blue-500 h-full rounded-full transition-all duration-1000"
            style={{ width: `${(timeLeft / 30) * 100}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {animals.map(a => (
          <button
            key={a.id}
            onClick={() => tapAnimal(a.id)}
            disabled={a.saved}
            className={`relative p-3 rounded-xl border-2 text-center transition-all
              ${a.saved ? "border-primary bg-primary/10 opacity-60" : "border-border bg-card hover:scale-105 active:scale-95"}
              ${flash === a.id && a.wrong ? "!border-destructive !bg-destructive/20" : ""}
              ${flash === a.id && !a.wrong ? "!border-primary !bg-primary/20" : ""}
            `}
          >
            <div className="text-3xl">{a.emoji}</div>
            <p className="text-xs font-semibold mt-1">{a.name}</p>
            {a.saved && <div className="absolute top-1 right-1 text-xs">✅</div>}
          </button>
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground mt-4">
        ⚠️ Criaturas falsas = -3 segundos!
      </p>
    </GameLayout>
  );
};

export default ArkSurvival;
