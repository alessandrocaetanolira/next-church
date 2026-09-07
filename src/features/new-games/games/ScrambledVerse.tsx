import { useState } from "react";
import GameLayout from "@/features/new-games/components/GameLayout";

const VERSES = [
  { ref: "João 3:16", words: ["Porque", "Deus", "amou", "o", "mundo", "de", "tal", "maneira"] },
  { ref: "Salmos 23:1", words: ["O", "Senhor", "é", "o", "meu", "pastor", "nada", "me", "faltará"] },
  { ref: "Filipenses 4:13", words: ["Tudo", "posso", "naquele", "que", "me", "fortalece"] },
  { ref: "Provérbios 3:5", words: ["Confia", "no", "Senhor", "de", "todo", "o", "teu", "coração"] },
  { ref: "Gênesis 1:1", words: ["No", "princípio", "Deus", "criou", "os", "céus", "e", "a", "terra"] },
  { ref: "Mateus 28:20", words: ["Eis", "que", "estou", "convosco", "todos", "os", "dias"] },
  { ref: "Romanos 8:28", words: ["Todas", "as", "coisas", "cooperam", "para", "o", "bem"] },
  { ref: "Isaías 41:10", words: ["Não", "temas", "porque", "eu", "sou", "contigo"] },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const ScrambledVerseGame = () => {
  const [verseIdx, setVerseIdx] = useState(0);
  const [score, setScore] = useState(0);

  const verse = VERSES[verseIdx % VERSES.length];
  const [scrambled, setScrambled] = useState(() => shuffle(verse.words.map((w, i) => ({ word: w, origIdx: i, id: `${i}` }))));
  const [placed, setPlaced] = useState<{ word: string; origIdx: number; id: string }[]>([]);
  const [checked, setChecked] = useState(false);

  const isCorrect = placed.length === verse.words.length && placed.every((p, i) => p.origIdx === i);

  const handleWordClick = (item: typeof scrambled[0]) => {
    if (checked) return;
    setScrambled(prev => prev.filter(s => s.id !== item.id));
    setPlaced(prev => [...prev, item]);
  };

  const handlePlacedClick = (item: typeof placed[0]) => {
    if (checked) return;
    setPlaced(prev => prev.filter(p => p.id !== item.id));
    setScrambled(prev => [...prev, item]);
  };

  const check = () => {
    setChecked(true);
    if (isCorrect) setScore(s => s + 1);
  };

  const next = () => {
    const nextIdx = verseIdx + 1;
    setVerseIdx(nextIdx);
    const nextVerse = VERSES[nextIdx % VERSES.length];
    setScrambled(shuffle(nextVerse.words.map((w, i) => ({ word: w, origIdx: i, id: `${nextIdx}-${i}` }))));
    setPlaced([]);
    setChecked(false);
  };

  const reset = () => {
    setScrambled(shuffle(verse.words.map((w, i) => ({ word: w, origIdx: i, id: `${verseIdx}-${i}` }))));
    setPlaced([]);
    setChecked(false);
  };

  return (
    <GameLayout title="Versículo Embaralhado" emoji="🔀">
      <div className="text-center mb-2">
        <span className="text-sm font-semibold bg-accent/20 px-3 py-1 rounded-full">⭐ {score}</span>
      </div>

      <div className="bg-card rounded-xl p-4 shadow-md border border-border mb-4 text-center">
        <p className="text-xs text-muted-foreground mb-2">{verse.ref}</p>
        <p className="text-sm text-muted-foreground">Organize as palavras na ordem correta</p>
      </div>

      {/* Placed area */}
      <div className="min-h-[60px] bg-secondary/50 rounded-lg p-2 mb-3 flex flex-wrap gap-1.5">
        {placed.length === 0 && <span className="text-sm text-muted-foreground p-1">Toque nas palavras abaixo...</span>}
        {placed.map((item, i) => (
          <button
            key={item.id}
            onClick={() => handlePlacedClick(item)}
            className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${
              checked
                ? item.origIdx === i ? "bg-game-success/20 text-game-success border border-game-success" : "bg-game-error/20 text-game-error border border-game-error"
                : "bg-primary text-primary-foreground"
            }`}
          >
            {item.word}
          </button>
        ))}
      </div>

      {/* Available words */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {scrambled.map(item => (
          <button
            key={item.id}
            onClick={() => handleWordClick(item)}
            className="px-3 py-1.5 rounded-md border-2 border-border bg-card text-sm font-semibold hover:bg-secondary transition-all"
          >
            {item.word}
          </button>
        ))}
      </div>

      {checked && isCorrect ? (
        <div className="text-center animate-bounce-in">
          <p className="text-xl font-display font-bold text-game-success mb-3">🎉 Perfeito!</p>
          <button onClick={next} className="btn-game">Próximo Versículo</button>
        </div>
      ) : checked ? (
        <div className="text-center">
          <p className="text-lg font-display font-bold text-game-error mb-3">Tente novamente!</p>
          <button onClick={reset} className="btn-game">Reorganizar</button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button onClick={check} disabled={placed.length !== verse.words.length} className="btn-game flex-1 disabled:opacity-40">
            Verificar
          </button>
          <button onClick={reset} className="px-4 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-secondary transition-colors">
            Limpar
          </button>
        </div>
      )}
    </GameLayout>
  );
};

export default ScrambledVerseGame;
