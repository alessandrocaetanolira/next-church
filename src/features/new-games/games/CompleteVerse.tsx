import { useState } from "react";
import GameLayout from "@/features/new-games/components/GameLayout";

const VERSES = [
  { ref: "João 3:16", text: "Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito", blank: "amou", options: ["amou", "criou", "viu", "ouviu"] },
  { ref: "Salmos 23:1", text: "O Senhor é o meu pastor e nada me faltará", blank: "pastor", options: ["guia", "pastor", "mestre", "amigo"] },
  { ref: "Filipenses 4:13", text: "Tudo posso naquele que me fortalece", blank: "fortalece", options: ["ajuda", "sustenta", "fortalece", "guia"] },
  { ref: "Provérbios 3:5", text: "Confia no Senhor de todo o teu coração", blank: "coração", options: ["mente", "ser", "coração", "espírito"] },
  { ref: "Romanos 8:28", text: "Todas as coisas cooperam para o bem daqueles que amam a Deus", blank: "bem", options: ["fim", "bem", "amor", "caminho"] },
  { ref: "Isaías 41:10", text: "Não temas porque eu sou contigo", blank: "contigo", options: ["forte", "fiel", "contigo", "santo"] },
];

const CompleteVerseGame = () => {
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  const verse = VERSES[current % VERSES.length];
  const parts = verse.text.split(verse.blank);

  const handleSelect = (opt: string) => {
    if (selected) return;
    setSelected(opt);
    if (opt === verse.blank) setScore(s => s + 1);
    setTimeout(() => {
      setCurrent(c => c + 1);
      setSelected(null);
    }, 1200);
  };

  return (
    <GameLayout title="Complete o Versículo" emoji="✍️">
      <div className="text-center mb-2">
        <span className="text-sm font-semibold bg-accent/20 px-3 py-1 rounded-full">⭐ {score}</span>
      </div>

      <div className="bg-card rounded-xl p-5 shadow-md border border-border mb-4">
        <p className="text-xs text-muted-foreground mb-2">{verse.ref}</p>
        <p className="font-body text-lg leading-relaxed">
          {parts[0]}
          <span className={`inline-block px-2 mx-1 border-b-2 font-bold ${selected === verse.blank ? "text-game-success border-game-success" : selected ? "text-game-error border-game-error" : "border-primary"}`}>
            {selected || "______"}
          </span>
          {parts[1]}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {verse.options.map(opt => (
          <button
            key={opt}
            onClick={() => handleSelect(opt)}
            className={`p-3 rounded-lg border-2 font-body font-semibold transition-all ${
              selected === opt
                ? opt === verse.blank ? "border-game-success bg-game-success/10" : "border-game-error bg-game-error/10"
                : "border-border bg-card"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </GameLayout>
  );
};

export default CompleteVerseGame;
