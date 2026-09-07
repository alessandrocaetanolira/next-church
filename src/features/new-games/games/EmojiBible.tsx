import { useState } from "react";
import GameLayout from "@/features/new-games/components/GameLayout";

const STORIES = [
  { emojis: "🍎🐍👫🌳", answer: "Adão e Eva", options: ["Adão e Eva", "Jardim do Éden", "Caim e Abel", "Torre de Babel"] },
  { emojis: "🚢🌊🐘🕊️🌈", answer: "Arca de Noé", options: ["Jonas", "Arca de Noé", "Moisés no Nilo", "Dilúvio"] },
  { emojis: "👦🪨💪🗡️", answer: "Davi e Golias", options: ["Sansão", "Davi e Golias", "Josué em Jericó", "Gideão"] },
  { emojis: "🐟🌊🙏😱", answer: "Jonas", options: ["Pedro pescador", "Jonas", "Jesus acalma o mar", "Moisés no Mar Vermelho"] },
  { emojis: "👶⭐🐪👑🎁", answer: "Nascimento de Jesus", options: ["Reis Magos", "Nascimento de Jesus", "Salomão", "Estrela de Belém"] },
  { emojis: "🦁🕳️🙏😇", answer: "Daniel na cova dos leões", options: ["Sansão e o leão", "Daniel na cova dos leões", "Davi pastor", "Elias"] },
  { emojis: "🔥🌿👣🏔️", answer: "Moisés e a sarça ardente", options: ["Elias no Monte Carmelo", "Sodoma e Gomorra", "Moisés e a sarça ardente", "Pentecostes"] },
  { emojis: "🍞🐟👥✋", answer: "Multiplicação dos pães", options: ["Última Ceia", "Multiplicação dos pães", "Maná no deserto", "Bodas de Caná"] },
  { emojis: "💇‍♂️💪🏛️💥", answer: "Sansão", options: ["Sansão", "Davi", "Josué em Jericó", "Elias"] },
  { emojis: "🌊🏃‍♂️🇪🇬⛰️📜", answer: "Êxodo do Egito", options: ["Êxodo do Egito", "Batismo de Jesus", "Jonas", "Noé"] },
  { emojis: "🏗️🧱🗣️🌍", answer: "Torre de Babel", options: ["Templo de Salomão", "Torre de Babel", "Muros de Jericó", "Arca da Aliança"] },
  { emojis: "💀➡️❤️🪦➡️☀️", answer: "Ressurreição de Jesus", options: ["Lázaro", "Ressurreição de Jesus", "Elias e o filho da viúva", "Ezequiel vale de ossos"] },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const EmojiBibleGame = () => {
  const [stories] = useState(() => shuffle(STORIES));
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  const story = stories[current % stories.length];

  const handleSelect = (opt: string) => {
    if (selected) return;
    setSelected(opt);
    if (opt === story.answer) setScore(s => s + 1);
    setTimeout(() => {
      if (current + 1 < stories.length) {
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
      <GameLayout title="Emoji Bíblico" emoji="😀">
        <div className="text-center animate-bounce-in mt-10">
          <div className="text-5xl mb-4">{score >= 10 ? "🏆" : score >= 6 ? "⭐" : "📖"}</div>
          <p className="font-display text-2xl font-bold">{score}/{stories.length}</p>
          <p className="text-muted-foreground mt-1">
            {score >= 10 ? "Incrível! Você é expert!" : score >= 6 ? "Muito bom!" : "Tente novamente!"}
          </p>
          <button onClick={restart} className="btn-game mt-6">Jogar Novamente</button>
        </div>
      </GameLayout>
    );
  }

  return (
    <GameLayout title="Emoji Bíblico" emoji="😀">
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm text-muted-foreground">{current + 1}/{stories.length}</span>
        <span className="text-sm font-semibold bg-accent/20 px-3 py-1 rounded-full">⭐ {score}</span>
      </div>

      <div className="bg-card rounded-xl p-6 shadow-md border border-border mb-4 text-center">
        <p className="text-4xl sm:text-5xl tracking-widest mb-3">{story.emojis}</p>
        <p className="text-muted-foreground text-sm">Qual história bíblica esses emojis representam?</p>
      </div>

      <div className="space-y-2">
        {story.options.map(opt => {
          let cls = "w-full p-4 rounded-lg border-2 text-left font-body font-semibold transition-all ";
          if (selected) {
            if (opt === story.answer) cls += "border-game-success bg-game-success/10";
            else if (opt === selected) cls += "border-game-error bg-game-error/10";
            else cls += "border-border bg-card opacity-50";
          } else {
            cls += "border-border bg-card hover:bg-secondary";
          }
          return (
            <button key={opt} onClick={() => handleSelect(opt)} className={cls}>
              {opt}
            </button>
          );
        })}
      </div>
    </GameLayout>
  );
};

export default EmojiBibleGame;
