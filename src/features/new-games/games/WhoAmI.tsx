import { useState } from "react";
import GameLayout from "@/features/new-games/components/GameLayout";

const CHARACTERS = [
  { name: "Moisés", clues: ["Fui criado no palácio do Faraó", "Abri o Mar Vermelho", "Recebi os Dez Mandamentos", "Liderei o povo pelo deserto por 40 anos"] },
  { name: "Davi", clues: ["Fui pastor de ovelhas", "Derrotei um gigante com uma funda", "Toquei harpa para o rei", "Me tornei o maior rei de Israel"] },
  { name: "Ester", clues: ["Fui uma jovem judia órfã", "Me tornei rainha da Pérsia", "Arrisquei minha vida pelo meu povo", "Meu primo se chamava Mordecai"] },
  { name: "Daniel", clues: ["Fui levado cativo para a Babilônia", "Interpretei sonhos do rei", "Fui lançado na cova dos leões", "Meus amigos foram jogados na fornalha"] },
  { name: "Noé", clues: ["Deus me deu uma tarefa gigantesca", "Construí algo muito grande", "Reuni animais de todas as espécies", "Sobrevivi a um dilúvio"] },
  { name: "Sansão", clues: ["Minha força era sobrenatural", "Fiz um voto de nazireu", "Uma mulher descobriu meu segredo", "Derrubei um templo com as mãos"] },
  { name: "Maria", clues: ["Recebi a visita de um anjo", "Fui escolhida para uma missão especial", "Meu noivo se chamava José", "Sou a mãe de Jesus"] },
  { name: "Abraão", clues: ["Saí da minha terra por ordem de Deus", "Recebi uma promessa de muitos descendentes", "Minha esposa riu de uma promessa", "Sou chamado de pai da fé"] },
];

const WhoAmIGame = () => {
  const [charIndex, setCharIndex] = useState(0);
  const [revealedClues, setRevealedClues] = useState(1);
  const [guess, setGuess] = useState("");
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [score, setScore] = useState(0);

  const character = CHARACTERS[charIndex % CHARACTERS.length];

  const checkGuess = () => {
    const normalized = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    if (normalized(guess) === normalized(character.name)) {
      setResult("correct");
      setScore(s => s + Math.max(1, 5 - revealedClues));
    } else {
      setResult("wrong");
      if (revealedClues < character.clues.length) {
        setTimeout(() => {
          setRevealedClues(r => r + 1);
          setResult(null);
          setGuess("");
        }, 1200);
      }
    }
  };

  const nextCharacter = () => {
    setCharIndex(i => i + 1);
    setRevealedClues(1);
    setGuess("");
    setResult(null);
  };

  return (
    <GameLayout title="Quem Sou Eu?" emoji="🤔">
      <div className="text-center mb-2">
        <span className="text-sm font-semibold bg-accent/20 px-3 py-1 rounded-full">⭐ {score} pontos</span>
      </div>

      <div className="bg-card rounded-xl p-5 shadow-md border border-border mb-4">
        <h2 className="font-display text-lg font-bold mb-4 text-center">Quem sou eu?</h2>
        <div className="space-y-3">
          {character.clues.slice(0, revealedClues).map((clue, i) => (
            <div key={i} className="flex gap-2 items-start animate-fade-in">
              <span className="text-accent font-bold">{i + 1}.</span>
              <p className="text-foreground font-body">{clue}</p>
            </div>
          ))}
          {revealedClues < character.clues.length && (
            <button
              onClick={() => setRevealedClues(r => r + 1)}
              className="text-sm text-primary underline"
            >
              Revelar mais uma dica ({character.clues.length - revealedClues} restantes)
            </button>
          )}
        </div>
      </div>

      {result === "correct" ? (
        <div className="text-center animate-bounce-in">
          <p className="text-xl font-display font-bold text-game-success">🎉 Correto! É {character.name}!</p>
          <button onClick={nextCharacter} className="btn-game mt-4">Próximo Personagem</button>
        </div>
      ) : result === "wrong" && revealedClues >= character.clues.length ? (
        <div className="text-center animate-bounce-in">
          <p className="text-xl font-display font-bold text-game-error">A resposta era: {character.name}</p>
          <button onClick={nextCharacter} className="btn-game mt-4">Próximo Personagem</button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            value={guess}
            onChange={e => setGuess(e.target.value)}
            onKeyDown={e => e.key === "Enter" && checkGuess()}
            placeholder="Digite o nome..."
            className={`flex-1 px-4 py-3 rounded-lg border-2 bg-card font-body text-lg ${result === "wrong" ? "border-destructive animate-shake" : "border-border"}`}
          />
          <button onClick={checkGuess} className="btn-game">Enviar</button>
        </div>
      )}
    </GameLayout>
  );
};

export default WhoAmIGame;
