import { useState } from "react";
import GameLayout from "@/features/new-games/components/GameLayout";

interface Person {
  name: string;
  category: "rei" | "profeta" | "apostolo";
}

const PEOPLE: Person[] = [
  { name: "Davi", category: "rei" },
  { name: "Salomão", category: "rei" },
  { name: "Saul", category: "rei" },
  { name: "Josias", category: "rei" },
  { name: "Ezequias", category: "rei" },
  { name: "Acabe", category: "rei" },
  { name: "Roboão", category: "rei" },
  { name: "Elias", category: "profeta" },
  { name: "Eliseu", category: "profeta" },
  { name: "Isaías", category: "profeta" },
  { name: "Jeremias", category: "profeta" },
  { name: "Ezequiel", category: "profeta" },
  { name: "Daniel", category: "profeta" },
  { name: "Amós", category: "profeta" },
  { name: "Pedro", category: "apostolo" },
  { name: "Paulo", category: "apostolo" },
  { name: "João", category: "apostolo" },
  { name: "Tiago", category: "apostolo" },
  { name: "André", category: "apostolo" },
  { name: "Mateus", category: "apostolo" },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const CATEGORIES = [
  { key: "rei" as const, label: "👑 Rei", color: "border-amber-500 bg-amber-500/10" },
  { key: "profeta" as const, label: "📢 Profeta", color: "border-blue-500 bg-blue-500/10" },
  { key: "apostolo" as const, label: "✝️ Apóstolo", color: "border-purple-500 bg-purple-500/10" },
];

const ROUND_SIZE = 12;

const KingsOrProphetsGame = () => {
  const [people] = useState(() => shuffle(PEOPLE).slice(0, ROUND_SIZE));
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [result, setResult] = useState<{ correct: boolean; actual: string } | null>(null);
  const [finished, setFinished] = useState(false);

  const person = people[current];

  const handleAnswer = (category: typeof person.category) => {
    if (result) return;
    const correct = category === person.category;
    if (correct) setScore(s => s + 1);
    const catLabel = CATEGORIES.find(c => c.key === person.category)!.label;
    setResult({ correct, actual: catLabel });
    setTimeout(() => {
      if (current + 1 < people.length) {
        setCurrent(c => c + 1);
        setResult(null);
      } else {
        setFinished(true);
      }
    }, 1200);
  };

  const restart = () => {
    setCurrent(0);
    setScore(0);
    setResult(null);
    setFinished(false);
  };

  if (finished) {
    return (
      <GameLayout title="Reis, Profetas ou Apóstolos" emoji="👑">
        <div className="text-center animate-bounce-in mt-10">
          <div className="text-5xl mb-4">{score >= 10 ? "🏆" : score >= 7 ? "⭐" : "📖"}</div>
          <p className="font-display text-2xl font-bold">{score}/{people.length}</p>
          <button onClick={restart} className="btn-game mt-6">Jogar Novamente</button>
        </div>
      </GameLayout>
    );
  }

  return (
    <GameLayout title="Reis, Profetas ou Apóstolos" emoji="👑">
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm text-muted-foreground">{current + 1}/{people.length}</span>
        <span className="text-sm font-semibold bg-accent/20 px-3 py-1 rounded-full">⭐ {score}</span>
      </div>

      <div className={`bg-card rounded-xl p-8 shadow-md border-2 mb-6 text-center transition-colors ${
        result ? (result.correct ? "border-game-success" : "border-game-error") : "border-border"
      }`}>
        <p className="font-display text-2xl font-bold">{person.name}</p>
        {result && !result.correct && (
          <p className="text-sm text-muted-foreground mt-2 animate-fade-in">Era: {result.actual}</p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => handleAnswer(cat.key)}
            className={`p-4 rounded-xl border-2 font-display font-bold text-sm text-center transition-all ${
              result && person.category === cat.key ? cat.color : "border-border bg-card hover:bg-secondary"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>
    </GameLayout>
  );
};

export default KingsOrProphetsGame;
