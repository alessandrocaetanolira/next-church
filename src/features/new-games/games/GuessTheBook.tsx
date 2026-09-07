import { useState } from "react";
import GameLayout from "@/features/new-games/components/GameLayout";

const BOOKS = [
  { name: "Gênesis", clues: ["Primeiro livro da Bíblia", "Conta a criação do mundo", "Fala sobre Adão e Eva", "Inclui a história de Noé e o dilúvio"] },
  { name: "Êxodo", clues: ["Segundo livro da Bíblia", "Conta a saída do Egito", "As 10 pragas são descritas aqui", "Moisés é o personagem principal"] },
  { name: "Salmos", clues: ["Livro de cânticos e orações", "Davi escreveu muitos deles", "O capítulo 23 é um dos mais famosos", "Contém 150 capítulos"] },
  { name: "Provérbios", clues: ["Livro de sabedoria", "Atribuído principalmente a Salomão", "Ensina sobre a vida prática", "Começa dizendo que o temor do Senhor é o princípio da sabedoria"] },
  { name: "Apocalipse", clues: ["Último livro da Bíblia", "Escrito por João", "Fala sobre o fim dos tempos", "Contém visões proféticas"] },
  { name: "Jonas", clues: ["Tem apenas 4 capítulos", "O protagonista fugiu de Deus", "Envolve um grande peixe", "A cidade de Nínive se arrependeu"] },
];

const GuessTheBookGame = () => {
  const [bookIdx, setBookIdx] = useState(0);
  const [revealedClues, setRevealedClues] = useState(1);
  const [guess, setGuess] = useState("");
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [score, setScore] = useState(0);

  const book = BOOKS[bookIdx % BOOKS.length];

  const checkGuess = () => {
    const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    if (normalize(guess) === normalize(book.name)) {
      setResult("correct");
      setScore(s => s + Math.max(1, 5 - revealedClues));
    } else {
      setResult("wrong");
      if (revealedClues < book.clues.length) {
        setTimeout(() => {
          setRevealedClues(r => r + 1);
          setResult(null);
          setGuess("");
        }, 1000);
      }
    }
  };

  const next = () => {
    setBookIdx(i => i + 1);
    setRevealedClues(1);
    setGuess("");
    setResult(null);
  };

  return (
    <GameLayout title="Adivinhe o Livro" emoji="📚">
      <div className="text-center mb-2">
        <span className="text-sm font-semibold bg-accent/20 px-3 py-1 rounded-full">⭐ {score}</span>
      </div>

      <div className="bg-card rounded-xl p-5 shadow-md border border-border mb-4">
        <h2 className="font-display text-lg font-bold mb-4 text-center">Qual livro da Bíblia?</h2>
        <div className="space-y-3">
          {book.clues.slice(0, revealedClues).map((clue, i) => (
            <div key={i} className="flex gap-2 items-start animate-fade-in">
              <span className="text-accent font-bold">{i + 1}.</span>
              <p className="font-body">{clue}</p>
            </div>
          ))}
          {revealedClues < book.clues.length && !result && (
            <button onClick={() => setRevealedClues(r => r + 1)} className="text-sm text-primary underline">
              Mais uma dica ({book.clues.length - revealedClues} restantes)
            </button>
          )}
        </div>
      </div>

      {result === "correct" ? (
        <div className="text-center animate-bounce-in">
          <p className="text-xl font-display font-bold text-game-success">🎉 Correto! {book.name}!</p>
          <button onClick={next} className="btn-game mt-4">Próximo Livro</button>
        </div>
      ) : result === "wrong" && revealedClues >= book.clues.length ? (
        <div className="text-center animate-bounce-in">
          <p className="text-xl font-display font-bold text-game-error">Era: {book.name}</p>
          <button onClick={next} className="btn-game mt-4">Próximo Livro</button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            value={guess}
            onChange={e => setGuess(e.target.value)}
            onKeyDown={e => e.key === "Enter" && checkGuess()}
            placeholder="Nome do livro..."
            className={`flex-1 px-4 py-3 rounded-lg border-2 bg-card font-body text-lg ${result === "wrong" ? "border-destructive animate-shake" : "border-border"}`}
          />
          <button onClick={checkGuess} className="btn-game">Enviar</button>
        </div>
      )}
    </GameLayout>
  );
};

export default GuessTheBookGame;
