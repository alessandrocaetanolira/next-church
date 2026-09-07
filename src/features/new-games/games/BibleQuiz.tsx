import { useState } from "react";
import GameLayout from "@/features/new-games/components/GameLayout";

const QUESTIONS = [
  { q: "Quantos dias Deus levou para criar o mundo?", options: ["5", "6", "7", "10"], answer: 1 },
  { q: "Quem construiu a arca?", options: ["Abraão", "Noé", "Moisés", "Davi"], answer: 1 },
  { q: "Qual o primeiro livro da Bíblia?", options: ["Êxodo", "Salmos", "Gênesis", "Mateus"], answer: 2 },
  { q: "Quem matou Golias?", options: ["Saul", "Sansão", "Josué", "Davi"], answer: 3 },
  { q: "Em que rio Jesus foi batizado?", options: ["Nilo", "Jordão", "Eufrates", "Tigre"], answer: 1 },
  { q: "Quantos apóstolos Jesus escolheu?", options: ["7", "10", "12", "70"], answer: 2 },
  { q: "Quem traiu Jesus?", options: ["Pedro", "Judas", "Tomé", "João"], answer: 1 },
  { q: "Qual o último livro da Bíblia?", options: ["Judas", "Malaquias", "Apocalipse", "Atos"], answer: 2 },
  { q: "Quem foi o primeiro homem?", options: ["Noé", "Adão", "Abel", "Caim"], answer: 1 },
  { q: "Quantos livros tem a Bíblia?", options: ["55", "66", "72", "39"], answer: 1 },
  { q: "Quem foi lançado na cova dos leões?", options: ["Elias", "Daniel", "Jonas", "Jeremias"], answer: 1 },
  { q: "Qual era a profissão de Jesus?", options: ["Pescador", "Carpinteiro", "Pastor", "Agricultor"], answer: 1 },
  { q: "Quem escreveu a maioria das cartas do NT?", options: ["Pedro", "João", "Paulo", "Tiago"], answer: 2 },
  { q: "Qual fruto era proibido no Éden?", options: ["Maçã", "Uva", "Figo", "Da árvore do conhecimento"], answer: 3 },
  { q: "Quem interpretou os sonhos do Faraó?", options: ["Moisés", "José", "Daniel", "Abraão"], answer: 1 },
  { q: "Qual o monte onde Moisés recebeu as tábuas?", options: ["Carmelo", "Sinai", "Sião", "Oliveiras"], answer: 1 },
  { q: "Quem foi o primeiro rei de Israel?", options: ["Davi", "Salomão", "Saul", "Josué"], answer: 2 },
  { q: "Quantas pragas caíram sobre o Egito?", options: ["5", "7", "10", "12"], answer: 2 },
  { q: "Quem andou sobre as águas?", options: ["Pedro", "João", "Tiago", "André"], answer: 0 },
  { q: "Qual cidade caiu ao som de trombetas?", options: ["Babilônia", "Jericó", "Nínive", "Sodoma"], answer: 1 },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const ROUND_SIZE = 10;

const BibleQuizGame = () => {
  const [questions] = useState(() => shuffle(QUESTIONS).slice(0, ROUND_SIZE));
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);

  const question = questions[current];

  const handleSelect = (i: number) => {
    if (selected !== null) return;
    setSelected(i);
    if (i === question.answer) setScore(s => s + 1);
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
      <GameLayout title="Quiz Bíblico" emoji="📖">
        <div className="text-center animate-bounce-in mt-10">
          <div className="text-5xl mb-4">{score >= 8 ? "🏆" : score >= 5 ? "⭐" : "📖"}</div>
          <p className="font-display text-2xl font-bold">{score}/{questions.length}</p>
          <p className="text-muted-foreground mt-1">
            {score >= 8 ? "Excelente! Você conhece bem a Bíblia!" : score >= 5 ? "Muito bom! Continue estudando!" : "Continue lendo a Bíblia!"}
          </p>
          <button onClick={restart} className="btn-game mt-6">Jogar Novamente</button>
        </div>
      </GameLayout>
    );
  }

  return (
    <GameLayout title="Quiz Bíblico" emoji="📖">
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm text-muted-foreground">{current + 1}/{questions.length}</span>
        <span className="text-sm font-semibold bg-accent/20 px-3 py-1 rounded-full">⭐ {score}</span>
      </div>

      <div className="bg-card rounded-xl p-5 shadow-md border border-border mb-4">
        <p className="font-display text-lg font-bold text-center">{question.q}</p>
      </div>

      <div className="space-y-2">
        {question.options.map((opt, i) => {
          let extraClass = "";
          if (selected !== null) {
            if (i === question.answer) extraClass = "!border-game-success !bg-game-success/10";
            else if (i === selected) extraClass = "!border-game-error !bg-game-error/10";
          }
          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              className={`w-full p-4 rounded-lg border-2 border-border bg-card text-left font-body font-semibold transition-all ${extraClass}`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </GameLayout>
  );
};

export default BibleQuizGame;
