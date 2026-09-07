import { useState, useEffect } from "react";
import GameLayout from "@/features/new-games/components/GameLayout";

const QUESTIONS = [
  { q: "Quem matou Golias?", options: ["Saul", "Davi", "Josué", "Sansão"], answer: 1 },
  { q: "Quantos dias durou o dilúvio?", options: ["7", "30", "40", "100"], answer: 2 },
  { q: "Quem foi jogado na cova dos leões?", options: ["Elias", "Daniel", "Jonas", "Moisés"], answer: 1 },
  { q: "Qual o primeiro milagre de Jesus?", options: ["Andar sobre águas", "Água em vinho", "Multiplicar pães", "Cura de cego"], answer: 1 },
  { q: "Quem negou Jesus 3 vezes?", options: ["Judas", "Tomé", "Pedro", "João"], answer: 2 },
  { q: "Quantas tribos de Israel?", options: ["7", "10", "12", "14"], answer: 2 },
  { q: "Quem foi engolido por um peixe?", options: ["Pedro", "Jonas", "Paulo", "Elias"], answer: 1 },
  { q: "Onde Jesus nasceu?", options: ["Nazaré", "Jerusalém", "Belém", "Cafarnaum"], answer: 2 },
  { q: "Qual a montanha dos 10 mandamentos?", options: ["Sião", "Sinai", "Carmelo", "Oliveiras"], answer: 1 },
  { q: "Quem batizou Jesus?", options: ["Pedro", "João Batista", "Elias", "Paulo"], answer: 1 },
  { q: "Quantos livros tem o Novo Testamento?", options: ["22", "25", "27", "30"], answer: 2 },
  { q: "Quem escreveu Apocalipse?", options: ["Paulo", "Pedro", "João", "Lucas"], answer: 2 },
  { q: "Qual fruto do Espírito vem primeiro?", options: ["Paz", "Amor", "Alegria", "Fé"], answer: 1 },
  { q: "Quem vendeu a primogenitura por sopa?", options: ["Jacó", "Esaú", "Ismael", "Caim"], answer: 1 },
  { q: "Quantos dias Jesus ficou no deserto?", options: ["7", "21", "40", "70"], answer: 2 },
  { q: "Quem era o irmão de Moisés?", options: ["Arão", "Josué", "Calebe", "Levi"], answer: 0 },
  { q: "Qual o menor livro da Bíblia?", options: ["Judas", "Filemom", "3 João", "Obadias"], answer: 3 },
  { q: "Quem sonhou com escada ao céu?", options: ["Abraão", "Jacó", "José", "Daniel"], answer: 1 },
  { q: "Qual rio o povo atravessou com Josué?", options: ["Nilo", "Jordão", "Eufrates", "Tigre"], answer: 1 },
  { q: "Quem construiu o primeiro templo?", options: ["Davi", "Salomão", "Moisés", "Esdras"], answer: 1 },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const BOMB_TIME = 8;

const BombQuiz = () => {
  const [questions] = useState(() => shuffle(QUESTIONS));
  const [current, setCurrent] = useState(0);
  const [timer, setTimer] = useState(BOMB_TIME);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [exploded, setExploded] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!started || exploded || selected !== null) return;
    if (timer <= 0) { setExploded(true); return; }
    const t = setTimeout(() => setTimer(ti => ti - 1), 1000);
    return () => clearTimeout(t);
  }, [timer, started, exploded, selected]);

  const handleAnswer = (i: number) => {
    if (selected !== null || exploded) return;
    setSelected(i);

    if (i === questions[current].answer) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > best) setBest(newStreak);
      setTimeout(() => {
        setCurrent(c => (c + 1) % questions.length);
        setSelected(null);
        setTimer(Math.max(BOMB_TIME - Math.floor(newStreak / 3), 4)); // gets harder
      }, 600);
    } else {
      setExploded(true);
    }
  };

  const restart = () => {
    setCurrent(0);
    setTimer(BOMB_TIME);
    setStreak(0);
    setExploded(false);
    setSelected(null);
    setStarted(true);
  };

  if (!started) {
    return (
      <GameLayout title="Quiz Bomba" emoji="💣">
        <div className="text-center mt-10 animate-fade-in">
          <div className="text-6xl mb-4 animate-pulse">💣</div>
          <p className="font-display text-xl font-bold mb-2">Quiz Bomba!</p>
          <p className="text-muted-foreground text-sm mb-6">
            Responda antes que a bomba exploda!<br/>
            Um erro = GAME OVER 💥
          </p>
          <button onClick={restart} className="btn-game text-lg px-8 py-3 bg-gradient-to-r from-red-500 to-orange-500">💣 Começar!</button>
        </div>
      </GameLayout>
    );
  }

  if (exploded) {
    return (
      <GameLayout title="Quiz Bomba" emoji="💣">
        <div className="text-center mt-10 animate-fade-in">
          <div className="text-7xl mb-4">💥</div>
          <p className="font-display text-2xl font-bold">BOOM!</p>
          <p className="text-muted-foreground mt-2">Sequência: {streak} acerto{streak !== 1 ? "s" : ""}</p>
          <p className="text-sm text-muted-foreground">Melhor: {best}</p>
          <button onClick={restart} className="btn-game mt-6 bg-gradient-to-r from-red-500 to-orange-500">💣 Tentar Novamente</button>
        </div>
      </GameLayout>
    );
  }

  const question = questions[current];

  return (
    <GameLayout title="Quiz Bomba" emoji="💣">
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm font-semibold">🔥 Streak: {streak}</span>
        <span className={`text-2xl font-bold ${timer <= 3 ? "text-destructive animate-pulse" : ""}`}>
          💣 {timer}s
        </span>
      </div>

      {/* Fuse animation */}
      <div className="w-full bg-muted rounded-full h-3 mb-4 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-1000 ${timer <= 3 ? "bg-destructive" : "bg-orange-500"}`}
          style={{ width: `${(timer / BOMB_TIME) * 100}%` }} />
      </div>

      <div className="bg-card rounded-xl p-5 shadow-md border border-border mb-4">
        <p className="font-display text-lg font-bold text-center">{question.q}</p>
      </div>

      <div className="space-y-2">
        {question.options.map((opt, i) => {
          let cls = "border-border bg-card";
          if (selected !== null) {
            if (i === question.answer) cls = "!border-primary !bg-primary/10";
            else if (i === selected) cls = "!border-destructive !bg-destructive/10";
          }
          return (
            <button key={i} onClick={() => handleAnswer(i)}
              className={`w-full p-4 rounded-lg border-2 text-left font-body font-semibold transition-all active:scale-95 ${cls}`}>
              {opt}
            </button>
          );
        })}
      </div>
    </GameLayout>
  );
};

export default BombQuiz;
