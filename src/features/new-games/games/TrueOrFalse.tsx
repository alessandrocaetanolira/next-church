import { useState } from "react";
import GameLayout from "@/features/new-games/components/GameLayout";

const STATEMENTS = [
  { text: "Moisés abriu o Mar Vermelho", answer: true },
  { text: "Davi era filho de Abraão", answer: false, note: "Era filho de Jessé" },
  { text: "Jesus nasceu em Belém", answer: true },
  { text: "Jonas foi engolido por uma baleia", answer: false, note: "Era um grande peixe!" },
  { text: "Pedro andou sobre as águas", answer: true },
  { text: "Há 73 livros na Bíblia protestante", answer: false, note: "São 66 livros" },
  { text: "Sansão perdeu a força ao cortar o cabelo", answer: true },
  { text: "O primeiro milagre de Jesus foi a multiplicação dos pães", answer: false, note: "Foi transformar água em vinho" },
  { text: "Paulo era originalmente chamado Saulo", answer: true },
  { text: "O Salmo 23 fala sobre o bom pastor", answer: true },
  { text: "Ester era rainha do Egito", answer: false, note: "Era rainha da Pérsia" },
  { text: "Jesus teve 12 apóstolos", answer: true },
  { text: "Noé levou 3 de cada animal na arca", answer: false, note: "Levou 2 de cada (7 dos animais puros)" },
  { text: "José foi vendido como escravo pelos irmãos", answer: true },
  { text: "Josué fez o sol parar", answer: true },
  { text: "Daniel interpretou sonhos na Babilônia", answer: true },
  { text: "Rute era neta de Abraão", answer: false, note: "Rute era moabita, bisavó de Davi" },
  { text: "Elias foi levado ao céu num carro de fogo", answer: true },
  { text: "A serpente tentou Adão primeiro", answer: false, note: "Tentou Eva primeiro" },
  { text: "Salomão construiu o primeiro templo", answer: true },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const ROUND = 12;

const TrueOrFalseGame = () => {
  const [statements] = useState(() => shuffle(STATEMENTS).slice(0, ROUND));
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [result, setResult] = useState<{ correct: boolean; note?: string } | null>(null);
  const [finished, setFinished] = useState(false);

  const statement = statements[current];

  const handleAnswer = (answer: boolean) => {
    if (result) return;
    const correct = answer === statement.answer;
    if (correct) setScore(s => s + 1);
    setResult({ correct, note: statement.note });
    setTimeout(() => {
      if (current + 1 < statements.length) {
        setCurrent(c => c + 1);
        setResult(null);
      } else {
        setFinished(true);
      }
    }, 1500);
  };

  const restart = () => {
    setCurrent(0);
    setScore(0);
    setResult(null);
    setFinished(false);
  };

  if (finished) {
    return (
      <GameLayout title="Verdadeiro ou Falso" emoji="✅">
        <div className="text-center animate-bounce-in mt-10">
          <div className="text-5xl mb-4">{score >= 10 ? "🏆" : score >= 7 ? "⭐" : "📖"}</div>
          <p className="font-display text-2xl font-bold">{score}/{statements.length}</p>
          <button onClick={restart} className="btn-game mt-6">Jogar Novamente</button>
        </div>
      </GameLayout>
    );
  }

  return (
    <GameLayout title="Verdadeiro ou Falso" emoji="✅">
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm text-muted-foreground">{current + 1}/{statements.length}</span>
        <span className="text-sm font-semibold bg-accent/20 px-3 py-1 rounded-full">⭐ {score}</span>
      </div>

      <div className={`bg-card rounded-xl p-6 shadow-md border-2 mb-6 transition-colors ${
        result ? (result.correct ? "border-game-success" : "border-game-error") : "border-border"
      }`}>
        <p className="font-display text-xl font-bold text-center leading-relaxed">{statement.text}</p>
        {result && result.note && (
          <p className="text-sm text-muted-foreground text-center mt-3 italic animate-fade-in">{result.note}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => handleAnswer(true)}
          className="p-4 rounded-xl border-2 border-border bg-card font-display text-lg font-bold transition-all hover:border-game-success hover:bg-game-success/5"
        >
          ✅ Verdadeiro
        </button>
        <button
          onClick={() => handleAnswer(false)}
          className="p-4 rounded-xl border-2 border-border bg-card font-display text-lg font-bold transition-all hover:border-game-error hover:bg-game-error/5"
        >
          ❌ Falso
        </button>
      </div>
    </GameLayout>
  );
};

export default TrueOrFalseGame;
