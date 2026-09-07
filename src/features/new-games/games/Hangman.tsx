import { useState, useCallback } from "react";
import GameLayout from "@/features/new-games/components/GameLayout";

const WORDS = [
  { word: "JONAS", hint: "Profeta engolido pelo grande peixe" },
  { word: "NINIVE", hint: "Cidade para onde Jonas devia ir" },
  { word: "TEMPESTADE", hint: "O que veio sobre o mar" },
  { word: "MISERICORDIA", hint: "Atributo de Deus mostrado a Nínive" },
  { word: "MOISES", hint: "Líder que tirou o povo do Egito" },
  { word: "FARAO", hint: "Governante que não queria libertar os hebreus" },
  { word: "DILUVIO", hint: "Deus cobriu a terra com água" },
  { word: "GOLIAS", hint: "Gigante filisteu derrotado por um jovem pastor" },
  { word: "SANSAO", hint: "Juiz cuja força vinha do cabelo" },
  { word: "ESTER", hint: "Rainha judia que salvou seu povo na Pérsia" },
  { word: "DANIEL", hint: "Profeta lançado na cova dos leões" },
  { word: "ABRAAO", hint: "Pai da fé, saiu de Ur por ordem de Deus" },
  { word: "SALOMAO", hint: "Rei sábio que construiu o templo" },
  { word: "ELIAS", hint: "Profeta que enfrentou os profetas de Baal" },
  { word: "LAZARO", hint: "Homem ressuscitado por Jesus após 4 dias" },
  { word: "BELEM", hint: "Cidade onde Jesus nasceu" },
  { word: "JARDIM", hint: "Lugar onde Adão e Eva viviam" },
  { word: "SERPENTE", hint: "Animal que tentou Eva" },
  { word: "BATISMO", hint: "Sacramento realizado no rio Jordão" },
  { word: "RESSURREICAO", hint: "Jesus venceu a morte ao terceiro dia" },
];

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const WhaleJonah = ({ errors }: { errors: number }) => {
  return (
    <svg viewBox="0 0 200 150" className="w-full max-w-[280px] mx-auto animate-whale-swim">
      <ellipse cx="100" cy="140" rx="90" ry="10" fill="hsl(210 60% 70%)" opacity="0.4" />
      <ellipse cx="100" cy="90" rx="70" ry="40" fill="hsl(210 40% 45%)" />
      <path d="M 30 90 Q 10 70 25 55 Q 30 75 40 80" fill="hsl(210 40% 45%)" />
      <circle cx="140" cy="80" r="4" fill="hsl(0 0% 100%)" />
      <circle cx="141" cy="80" r="2" fill="hsl(0 0% 10%)" />
      <path d={`M 155 95 Q 170 ${95 + errors * 3} 155 ${95 + errors * 6}`} fill="none" stroke="hsl(210 40% 35%)" strokeWidth="2" />
      {errors >= 1 && <circle cx="158" cy={100 + errors * 2} r="5" fill="hsl(35 60% 65%)" />}
      {errors >= 2 && <line x1="158" y1={105 + errors * 2} x2="158" y2={115 + errors * 2} stroke="hsl(35 60% 55%)" strokeWidth="2" />}
      {errors >= 3 && <line x1="158" y1={108 + errors * 2} x2="152" y2={112 + errors * 2} stroke="hsl(35 60% 55%)" strokeWidth="2" />}
      {errors >= 4 && <line x1="158" y1={108 + errors * 2} x2="164" y2={112 + errors * 2} stroke="hsl(35 60% 55%)" strokeWidth="2" />}
      {errors >= 5 && <line x1="158" y1={115 + errors * 2} x2="153" y2={122 + errors * 2} stroke="hsl(35 60% 55%)" strokeWidth="2" />}
      {errors >= 6 && <line x1="158" y1={115 + errors * 2} x2="163" y2={122 + errors * 2} stroke="hsl(35 60% 55%)" strokeWidth="2" />}
      <path d="M 60 130 Q 70 120 80 130 Q 90 120 100 130 Q 110 120 120 130 Q 130 120 140 130" fill="none" stroke="hsl(210 60% 70%)" strokeWidth="2" opacity="0.6" />
    </svg>
  );
};

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const HangmanGame = () => {
  const [shuffledWords] = useState(() => shuffleArray(WORDS));
  const [level, setLevel] = useState(0);
  const [guessed, setGuessed] = useState<Set<string>>(new Set());

  const current = shuffledWords[level % shuffledWords.length];
  const word = current.word.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  const displayWord = current.word.toUpperCase();

  const errors = [...guessed].filter(l => !word.includes(l)).length;
  const maxErrors = 6;
  const won = [...word].every(l => guessed.has(l));
  const lost = errors >= maxErrors;

  const handleGuess = useCallback((letter: string) => {
    if (won || lost || guessed.has(letter)) return;
    setGuessed(prev => new Set([...prev, letter]));
  }, [won, lost, guessed]);

  const nextWord = () => {
    setLevel(l => l + 1);
    setGuessed(new Set());
  };

  return (
    <GameLayout title="Jogo da Forca" emoji="🐋">
      <WhaleJonah errors={errors} />

      <p className="text-center text-sm text-muted-foreground mt-2 mb-4 italic">"{current.hint}"</p>

      <div className="flex justify-center gap-2 mb-6 flex-wrap">
        {displayWord.split("").map((letter, i) => {
          const normalized = letter.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
          const revealed = guessed.has(normalized) || won || lost;
          return (
            <div key={i} className={`w-9 h-11 border-b-2 flex items-center justify-center text-xl font-bold font-body transition-all ${revealed ? (lost && !guessed.has(normalized) ? "text-game-error" : "text-foreground") : "border-foreground"}`}>
              {revealed ? letter : ""}
            </div>
          );
        })}
      </div>

      {(won || lost) && (
        <div className="text-center mb-4 animate-bounce-in">
          <p className={`text-lg font-display font-bold ${won ? "text-game-success" : "text-game-error"}`}>
            {won ? "🎉 Parabéns!" : "😢 Jonas foi engolido!"}
          </p>
          <button onClick={nextWord} className="btn-game mt-3">Próxima Palavra</button>
        </div>
      )}

      <div className="grid grid-cols-7 gap-1.5 max-w-sm mx-auto">
        {ALPHABET.map(letter => {
          const used = guessed.has(letter);
          const isCorrect = used && word.includes(letter);
          const isWrong = used && !word.includes(letter);
          return (
            <button
              key={letter}
              onClick={() => handleGuess(letter)}
              disabled={used || won || lost}
              className={`letter-btn ${used ? "letter-btn-used" : ""} ${isCorrect ? "!bg-game-highlight !opacity-100 !border-game-highlight" : ""} ${isWrong ? "!bg-destructive/20 !opacity-100 !border-destructive" : ""}`}
            >
              {letter}
            </button>
          );
        })}
      </div>
    </GameLayout>
  );
};

export default HangmanGame;
