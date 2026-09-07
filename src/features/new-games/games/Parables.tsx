import { useState } from "react";
import GameLayout from "@/features/new-games/components/GameLayout";

const PARABLES = [
  { description: "Um homem plantou sementes em diferentes tipos de solo: caminho, pedras, espinhos e boa terra.", answer: "Parábola do Semeador", options: ["Parábola do Semeador", "Parábola do Trigo e do Joio", "Parábola do Grão de Mostarda", "Parábola dos Talentos"] },
  { description: "Um pai recebeu de braços abertos o filho que havia gastado toda a herança.", answer: "Parábola do Filho Pródigo", options: ["Parábola do Bom Samaritano", "Parábola do Filho Pródigo", "Parábola das Dez Virgens", "Parábola do Rico e Lázaro"] },
  { description: "Um viajante ferido foi ignorado por um sacerdote e um levita, mas ajudado por um estrangeiro.", answer: "Parábola do Bom Samaritano", options: ["Parábola do Servo Impiedoso", "Parábola do Bom Pastor", "Parábola do Bom Samaritano", "Parábola dos Trabalhadores"] },
  { description: "Um homem deixou 99 para ir buscar uma que se perdeu.", answer: "Parábola da Ovelha Perdida", options: ["Parábola da Ovelha Perdida", "Parábola do Bom Pastor", "Parábola do Semeador", "Parábola dos Talentos"] },
  { description: "Um servo recebeu dinheiro do senhor e enterrou no chão em vez de investir.", answer: "Parábola dos Talentos", options: ["Parábola das Minas", "Parábola dos Talentos", "Parábola do Rico Insensato", "Parábola do Tesouro Escondido"] },
  { description: "Dez moças esperavam o noivo; cinco trouxeram óleo extra e cinco não.", answer: "Parábola das Dez Virgens", options: ["Parábola das Dez Virgens", "Parábola da Dracma Perdida", "Parábola do Fermento", "Parábola da Figueira"] },
  { description: "Uma semente muito pequena cresce até se tornar a maior das hortaliças.", answer: "Parábola do Grão de Mostarda", options: ["Parábola do Fermento", "Parábola do Semeador", "Parábola do Grão de Mostarda", "Parábola do Joio"] },
  { description: "Um homem encontrou algo precioso num campo e vendeu tudo para comprar aquele campo.", answer: "Parábola do Tesouro Escondido", options: ["Parábola da Pérola", "Parábola do Tesouro Escondido", "Parábola dos Talentos", "Parábola do Rico Insensato"] },
  { description: "Um rei perdoou a dívida enorme de um servo, mas esse servo não perdoou uma dívida pequena.", answer: "Parábola do Servo Impiedoso", options: ["Parábola do Servo Impiedoso", "Parábola dos Trabalhadores", "Parábola do Filho Pródigo", "Parábola do Juiz Iníquo"] },
  { description: "Uma mulher varreu a casa inteira procurando uma moeda perdida e fez festa ao encontrá-la.", answer: "Parábola da Dracma Perdida", options: ["Parábola da Ovelha Perdida", "Parábola da Dracma Perdida", "Parábola do Tesouro Escondido", "Parábola das Dez Virgens"] },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const ParablesGame = () => {
  const [parables] = useState(() => shuffle(PARABLES));
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  const parable = parables[current];

  const handleSelect = (opt: string) => {
    if (selected) return;
    setSelected(opt);
    if (opt === parable.answer) setScore(s => s + 1);
    setTimeout(() => {
      if (current + 1 < parables.length) {
        setCurrent(c => c + 1);
        setSelected(null);
      } else {
        setFinished(true);
      }
    }, 1200);
  };

  const restart = () => {
    setCurrent(0);
    setScore(0);
    setSelected(null);
    setFinished(false);
  };

  if (finished) {
    return (
      <GameLayout title="Parábolas de Jesus" emoji="📜">
        <div className="text-center animate-bounce-in mt-10">
          <div className="text-5xl mb-4">{score >= 8 ? "🏆" : score >= 5 ? "⭐" : "📖"}</div>
          <p className="font-display text-2xl font-bold">{score}/{parables.length}</p>
          <button onClick={restart} className="btn-game mt-6">Jogar Novamente</button>
        </div>
      </GameLayout>
    );
  }

  return (
    <GameLayout title="Parábolas de Jesus" emoji="📜">
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm text-muted-foreground">{current + 1}/{parables.length}</span>
        <span className="text-sm font-semibold bg-accent/20 px-3 py-1 rounded-full">⭐ {score}</span>
      </div>

      <div className="bg-card rounded-xl p-5 shadow-md border border-border mb-4">
        <p className="font-body text-base leading-relaxed text-center">{parable.description}</p>
      </div>

      <div className="space-y-2">
        {parable.options.map(opt => {
          let cls = "w-full p-4 rounded-lg border-2 text-left font-body font-semibold transition-all ";
          if (selected) {
            if (opt === parable.answer) cls += "border-game-success bg-game-success/10";
            else if (opt === selected) cls += "border-game-error bg-game-error/10";
            else cls += "border-border bg-card opacity-50";
          } else {
            cls += "border-border bg-card hover:bg-secondary";
          }
          return (
            <button key={opt} onClick={() => handleSelect(opt)} className={cls}>{opt}</button>
          );
        })}
      </div>
    </GameLayout>
  );
};

export default ParablesGame;
