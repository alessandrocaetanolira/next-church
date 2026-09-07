import { useState } from "react";
import GameLayout from "@/features/new-games/components/GameLayout";

const QUESTIONS = [
  { q: "Quantas tribos de Israel existiam?", answer: 12, options: [10, 12, 14, 7] },
  { q: "Quantos dias durou o dilúvio?", answer: 40, options: [30, 40, 50, 7] },
  { q: "Quantos anos os israelitas ficaram no deserto?", answer: 40, options: [20, 30, 40, 50] },
  { q: "Quantas pragas caíram sobre o Egito?", answer: 10, options: [7, 10, 12, 15] },
  { q: "Quantos mandamentos Deus deu a Moisés?", answer: 10, options: [5, 7, 10, 12] },
  { q: "Quantos livros tem o Novo Testamento?", answer: 27, options: [22, 27, 33, 39] },
  { q: "Quantos livros tem o Antigo Testamento?", answer: 39, options: [27, 33, 39, 46] },
  { q: "Quantos dias Jesus ficou no deserto?", answer: 40, options: [30, 40, 50, 12] },
  { q: "Quantos anos Matusalém viveu?", answer: 969, options: [777, 850, 969, 1000] },
  { q: "Quantos capítulos tem o livro de Salmos?", answer: 150, options: [100, 119, 150, 200] },
  { q: "Com quantos pães Jesus alimentou a multidão?", answer: 5, options: [3, 5, 7, 12] },
  { q: "Quantos peixes havia na multiplicação?", answer: 2, options: [2, 3, 5, 7] },
  { q: "Quantas vezes Pedro negou Jesus?", answer: 3, options: [2, 3, 4, 7] },
  { q: "Quantos dias Jonas ficou no peixe?", answer: 3, options: [1, 2, 3, 7] },
  { q: "Quantos filhos Jacó teve?", answer: 12, options: [7, 10, 12, 15] },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const ROUND = 10;

const BibleMathGame = () => {
  const [questions] = useState(() => shuffle(QUESTIONS).slice(0, ROUND));
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);

  const question = questions[current];

  const handleSelect = (num: number) => {
    if (selected !== null) return;
    setSelected(num);
    if (num === question.answer) setScore(s => s + 1);
    setTimeout(() => {
      if (current + 1 < questions.length) {
        setCurrent(c => c + 1);
        setSelected(null);
      } else {
        setFinished(true);
      }
    }, 1000);
  };

  const restart = () => {
    setCurrent(0);
    setScore(0);
    setSelected(null);
    setFinished(false);
  };

  if (finished) {
    return (
      <GameLayout title="Números da Bíblia" emoji="🔢">
        <div className="text-center animate-bounce-in mt-10">
          <div className="text-5xl mb-4">{score >= 8 ? "🏆" : score >= 5 ? "⭐" : "📖"}</div>
          <p className="font-display text-2xl font-bold">{score}/{questions.length}</p>
          <button onClick={restart} className="btn-game mt-6">Jogar Novamente</button>
        </div>
      </GameLayout>
    );
  }

  return (
    <GameLayout title="Números da Bíblia" emoji="🔢">
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm text-muted-foreground">{current + 1}/{questions.length}</span>
        <span className="text-sm font-semibold bg-accent/20 px-3 py-1 rounded-full">⭐ {score}</span>
      </div>

      <div className="bg-card rounded-xl p-5 shadow-md border border-border mb-4">
        <p className="font-display text-lg font-bold text-center">{question.q}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {question.options.map(num => {
          let cls = "p-4 rounded-lg border-2 text-center font-display text-xl font-bold transition-all ";
          if (selected !== null) {
            if (num === question.answer) cls += "border-game-success bg-game-success/10";
            else if (num === selected) cls += "border-game-error bg-game-error/10";
            else cls += "border-border bg-card opacity-50";
          } else {
            cls += "border-border bg-card hover:bg-secondary";
          }
          return (
            <button key={num} onClick={() => handleSelect(num)} className={cls}>{num}</button>
          );
        })}
      </div>
    </GameLayout>
  );
};

export default BibleMathGame;
